// Adaptador de SQL Server (mssql / TDS). Actívalo con DB_DRIVER=mssql en .env.
// Requiere: los scripts de db/sqlserver/ ejecutados en la instancia.
const sql = require('mssql');

const config = {
  server: process.env.MSSQL_SERVER || 'localhost',
  port: Number(process.env.MSSQL_PORT || 1433),
  database: process.env.MSSQL_DB || 'tienda_db',
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || '',
  options: { encrypt: false, trustServerCertificate: true },   // local
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let poolPromise;
function pool() {
  if (!poolPromise) poolPromise = sql.connect(config);
  return poolPromise;
}

// ---- helpers ----
async function query(text, params = {}) {
  const p = await pool();
  const req = p.request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  return req.query(text);
}
async function exec(sp, params = {}) {
  const p = await pool();
  const req = p.request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  return req.execute(sp);
}

module.exports = {
  sql, config, pool, query, exec,

  // ---------- usuarios ----------
  async getUser(usuario) {
    const r = await query('SELECT * FROM dbo.usuarios WHERE usuario = @u', { u: usuario });
    return r.recordset[0] || null;
  },

  // ---------- catálogo ----------
  async getCategorias() {
    const r = await query('SELECT id, nombre FROM dbo.categorias ORDER BY nombre');
    return r.recordset;
  },
  async createCategoria(nombre) {
    try {
      const r = await query(
        'INSERT INTO dbo.categorias (nombre) OUTPUT INSERTED.id VALUES (@n)', { n: nombre });
      return { id: r.recordset[0].id, nombre };
    } catch (e) {
      if (/UX_categorias_nombre|Violation of UNIQUE/i.test(e.message)) return { conflict: true };
      throw e;
    }
  },
  async categoriaEnUso(id) {
    const r = await query('SELECT COUNT(*) AS c FROM dbo.productos WHERE categoria_id = @id AND activo = 1', { id });
    return r.recordset[0].c > 0;
  },
  async deleteCategoria(id) {
    await query('DELETE FROM dbo.categorias WHERE id = @id', { id });
  },

  async getProductos() {
    const r = await query('SELECT * FROM dbo.vw_catalogo ORDER BY categoria, nombre');
    return r.recordset;
  },
  async getProducto(id) {
    const r = await query('SELECT * FROM dbo.vw_catalogo WHERE id = @id', { id });
    return r.recordset[0] || null;
  },
  async createProducto(p) {
    const r = await query(`INSERT INTO dbo.productos (nombre, categoria_id, precio, imagen, descripcion)
                           OUTPUT INSERTED.id VALUES (@n, @c, @pr, @i, @d)`,
      { n: p.nombre, c: p.categoria_id, pr: p.precio, i: p.imagen || '', d: p.descripcion || '' });
    return r.recordset[0].id;
  },
  async updateProducto(id, campos) {
    const permitidos = ['nombre', 'categoria_id', 'precio', 'imagen', 'descripcion'];
    const sets = [], params = { id };
    for (const c of permitidos) if (c in campos) { sets.push(`${c} = @${c}`); params[c] = campos[c]; }
    if (!sets.length) return false;
    await query(`UPDATE dbo.productos SET ${sets.join(', ')} WHERE id = @id`, params);
    return true;
  },
  async deleteProducto(id) {
    // borrado lógico para no romper FK de pedido_items
    await query('UPDATE dbo.productos SET activo = 0 WHERE id = @id', { id });
  },

  // ---------- pedidos ----------
  async crearPedido({ cliente, telefono, dedicatoria, entrega, items }) {
    const r = await exec('sp_crear_pedido', {
      cliente, telefono: telefono || '', dedicatoria: dedicatoria || '',
      entrega: entrega || '', items_json: JSON.stringify(items)
    });
    const row = r.recordset[0];
    return { id: row.id, total: Number(row.total) };
  },
  async getPedidos() {
    const r = await exec('sp_listar_pedidos');
    return r.recordset.map(p => ({ ...p, total: Number(p.total), detalle: JSON.parse(p.detalle) }));
  },
  async getPedido(id) {
    const r = await query('SELECT p.*, (SELECT JSON_QUERY((SELECT i.nombre, i.cantidad, i.precio_unitario AS precio, i.subtotal FROM dbo.pedido_items i WHERE i.pedido_id = p.id FOR JSON PATH))) AS detalle FROM dbo.pedidos p WHERE p.id = @id', { id });
    const p = r[0];
    if (!p) return null;
    p.detalle = p.detalle ? JSON.parse(p.detalle) : [];
    p.total = Number(p.total);
    return p;
  },
  async actualizarEstadoPedido(id, estado) {
    try { await exec('sp_actualizar_estado_pedido', { id, estado }); return true; }
    catch (e) {
      if (/Estado inválido/.test(e.message)) return { invalid: 'estado' };
      if (/Pedido no encontrado/.test(e.message)) return { notFound: true };
      throw e;
    }
  },

  isMssql: true
};
