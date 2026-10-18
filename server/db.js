// Fábrica de capa de datos: elige SQLite (por defecto) o SQL Server según DB_DRIVER.
// Las rutas consumen SIEMPRE esta interfaz asíncrona, sin saber qué motor hay detrás:
//   getUser · getCategorias · createCategoria · categoriaEnUso · deleteCategoria
//   getProductos · getProducto · createProducto · updateProducto · deleteProducto
//   crearPedido · getPedidos · actualizarEstadoPedido
module.exports = function crearDb() {
  if ((process.env.DB_DRIVER || 'sqlite').toLowerCase() === 'mssql') {
    return require('./db.mssql');       // -> SQL Server (scripts en db/sqlserver/)
  }
  const sqlite = require('better-sqlite3');
  const path = require('path');
  const fs = require('fs');
  const bcrypt = require('bcryptjs');

  const dbDir = path.join(__dirname, '..', 'db');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const db = new sqlite(path.join(dbDir, 'tienda.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  categoria_id INTEGER NOT NULL,
  precio REAL NOT NULL CHECK (precio > 0),
  imagen TEXT DEFAULT '',
  descripcion TEXT DEFAULT '',
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente TEXT NOT NULL,
  telefono TEXT DEFAULT '',
  detalle TEXT NOT NULL,      -- JSON: [{id,nombre,cantidad,precio,subtotal}]
  total REAL NOT NULL,
  dedicatoria TEXT DEFAULT '',
  entrega TEXT DEFAULT '',
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','anulado')),
  creado_en TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'admin'
);`);

  // ---- semilla idempotente ----
  if (!db.prepare('SELECT COUNT(*) c FROM categorias').get().c) {
    const insCat = db.prepare('INSERT INTO categorias (nombre) VALUES (?)');
    const insProd = db.prepare('INSERT INTO productos (nombre, categoria_id, precio, imagen, descripcion) VALUES (?,?,?,?,?)');
    ['Bombas de Baño', 'Sets de Regalo', 'Velas Aromatizadas'].forEach(n => insCat.run(n));
    [
      ['Bomba de Baño Lavanda', 1, 12, '', 'Bomba efervescente artesanal'],
      ['Bomba de Baño Rosa',    1, 12, '', 'Con manteca de karité'],
      ['Set Spa Completo',      2, 45, '', 'Bomba + vela + sales'],
      ['Set Cumpleaños',        2, 35, '', 'Personalizable con dedicatoria'],
      ['Vela Vainilla',         3, 18, '', 'Cera de soja, 30h de duración'],
      ['Vela Lavanda',          3, 18, '', 'Cera de soja, 30h de duración']
    ].forEach(s => insProd.run(...s));
  }
  if (!db.prepare('SELECT COUNT(*) c FROM usuarios').get().c) {
    db.prepare('INSERT INTO usuarios (usuario, password_hash, rol) VALUES (?,?,?)')
      .run(process.env.ADMIN_USER || 'admin',
           bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10), 'admin');
  }

  // ---- interfaz común (envoltorios síncronos sobre better-sqlite3) ----
  return {
    isMssql: false,
    async getUser(usuario) {
      return db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario) || null;
    },
    async getCategorias() {
      return db.prepare('SELECT * FROM categorias ORDER BY nombre').all();
    },
    async createCategoria(nombre) {
      try {
        const r = db.prepare('INSERT INTO categorias (nombre) VALUES (?)').run(nombre);
        return { id: r.lastInsertRowid, nombre };
      } catch (e) {
        if (/UNIQUE/i.test(e.message)) return { conflict: true };
        throw e;
      }
    },
    async categoriaEnUso(id) {
      return db.prepare('SELECT COUNT(*) c FROM productos WHERE categoria_id = ?').get(id).c > 0;
    },
    async deleteCategoria(id) {
      db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
    },
    async getProductos() {
      return db.prepare(`SELECT p.*, c.nombre AS categoria FROM productos p
                         JOIN categorias c ON c.id = p.categoria_id
                         ORDER BY c.nombre, p.nombre`).all();
    },
    async getProducto(id) {
      return db.prepare('SELECT * FROM productos WHERE id = ?').get(id) || null;
    },
    async createProducto(p) {
      const r = db.prepare('INSERT INTO productos (nombre, categoria_id, precio, imagen, descripcion) VALUES (?,?,?,?,?)')
        .run(p.nombre, p.categoria_id, p.precio, p.imagen || '', p.descripcion || '');
      return Number(r.lastInsertRowid);
    },
    async updateProducto(id, campos) {
      const permitidos = ['nombre', 'categoria_id', 'precio', 'imagen', 'descripcion'];
      const sets = [], vals = [];
      for (const c of permitidos) if (c in campos) { sets.push(`${c} = ?`); vals.push(campos[c]); }
      if (!sets.length) return false;
      db.prepare(`UPDATE productos SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
      return true;
    },
    async deleteProducto(id) {
      db.prepare('DELETE FROM productos WHERE id = ?').run(id);
    },
    async crearPedido({ cliente, telefono, dedicatoria, entrega, items }) {
      const getProd = db.prepare('SELECT id, nombre, precio FROM productos WHERE id = ?');
      const detalle = [];
      let total = 0;
      for (const it of items) {
        const p = getProd.get(it.id);
        if (!p) throw new Error(`Producto no disponible: id ${it.id}`);
        const cant = Math.max(1, parseInt(it.cantidad) || 1);
        const subtotal = +(p.precio * cant).toFixed(2);
        detalle.push({ id: p.id, nombre: p.nombre, cantidad: cant, precio: p.precio, subtotal });
        total += subtotal;
      }
      total = +total.toFixed(2);
      const r = db.prepare(`INSERT INTO pedidos (cliente, telefono, detalle, total, dedicatoria, entrega)
                            VALUES (?,?,?,?,?,?)`)
        .run(cliente, telefono || '', JSON.stringify(detalle), total, dedicatoria || '', entrega || '');
      return { id: Number(r.lastInsertRowid), total };
    },
    async getPedidos() {
      const rows = db.prepare('SELECT * FROM pedidos ORDER BY id DESC').all();
      rows.forEach(p => p.detalle = JSON.parse(p.detalle));
      return rows;
    },
    async getPedido(id) {
      const p = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
      if (!p) return null;
      p.detalle = JSON.parse(p.detalle);
      return p;
    },
    async actualizarEstadoPedido(id, estado) {
      if (!['pendiente', 'confirmado', 'anulado'].includes(estado)) return { invalid: 'estado' };
      const r = db.prepare('UPDATE pedidos SET estado = ? WHERE id = ?').run(estado, id);
      if (!r.changes) return { notFound: true };
      return true;
    }
  };
};
