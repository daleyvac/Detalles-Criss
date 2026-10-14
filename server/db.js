// Capa de datos: base SQLite local (archivo db/tienda.db)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'tienda.db'));
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
  precio REAL NOT NULL,
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
  estado TEXT DEFAULT 'pendiente', -- pendiente | confirmado | anulado
  creado_en TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'admin'
);
`);

// Datos semilla solo si está vacío
const tieneCats = db.prepare('SELECT COUNT(*) c FROM categorias').get().c;
if (!tieneCats) {
  const insCat = db.prepare('INSERT INTO categorias (nombre) VALUES (?)');
  const insProd = db.prepare('INSERT INTO productos (nombre, categoria_id, precio, imagen, descripcion) VALUES (?,?,?,?,?)');
  const cats = ['Bombas de Baño', 'Sets de Regalo', 'Velas Aromatizadas'].map(n => insCat.run(n).lastInsertRowid);
  const semillas = [
    ['Bomba de Baño Lavanda', 1, 12, '', 'Bomba efervescente artesanal'],
    ['Bomba de Baño Rosa', 1, 12, '', 'Con manteca de karité'],
    ['Set Spa Completo', 2, 45, '', 'Bomba + vela + sales'],
    ['Set Cumpleaños', 2, 35, '', 'Personalizable con dedicatoria'],
    ['Vela Vainilla', 3, 18, '', 'Cera de soja, 30h de duración'],
    ['Vela Lavanda', 3, 18, '', 'Cera de soja, 30h de duración']
  ];
  semillas.forEach(s => insProd.run(...s));
}

const tieneUsers = db.prepare('SELECT COUNT(*) c FROM usuarios').get().c;
if (!tieneUsers) {
  const bcrypt = require('bcryptjs');
  db.prepare('INSERT INTO usuarios (usuario, password_hash, rol) VALUES (?,?,?)')
    .run('admin', bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10), 'admin');
}

module.exports = db;
