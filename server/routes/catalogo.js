// API del catálogo: categorías y productos.
// Lectura pública; escritura solo admin. Compatible SQLite y SQL Server.
const express = require('express');
const db = require('../db-instance');
const { requiereAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/categorias -> pública
router.get('/categorias', async (req, res, next) => {
  try { res.json(await db.getCategorias()); } catch (e) { next(e); }
});

// POST /api/categorias -> admin
router.post('/categorias', requiereAdmin, async (req, res, next) => {
  try {
    const nombre = (req.body?.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const r = await db.createCategoria(nombre);
    if (r.conflict) return res.status(409).json({ error: 'La categoría ya existe' });
    res.status(201).json({ id: r.id, nombre });
  } catch (e) { next(e); }
});

// DELETE /api/categorias/:id -> admin (bloqueado si tiene productos activos)
router.delete('/categorias/:id', requiereAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id inválido' });
    if (await db.categoriaEnUso(id))
      return res.status(400).json({ error: 'No se puede eliminar: tiene productos asociados' });
    await db.deleteCategoria(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/productos -> pública (con nombre de categoría)
router.get('/productos', async (req, res, next) => {
  try { res.json(await db.getProductos()); } catch (e) { next(e); }
});

// POST /api/productos -> admin
router.post('/productos', requiereAdmin, async (req, res, next) => {
  try {
    const { nombre, categoria_id, precio, imagen = '', descripcion = '' } = req.body || {};
    if (!nombre || !String(nombre).trim())
      return res.status(400).json({ error: 'nombre es requerido' });
    const catId = Number(categoria_id);
    if (!Number.isInteger(catId) || !(await db.getCategorias()).some(c => c.id === catId))
      return res.status(400).json({ error: 'categoria_id no existe' });
    const p = Number(precio);
    if (!(p > 0)) return res.status(400).json({ error: 'precio debe ser mayor a 0' });
    const id = await db.createProducto({ nombre: String(nombre).trim(), categoria_id: catId, precio: p, imagen, descripcion });
    res.status(201).json({ id });
  } catch (e) { next(e); }
});

// PUT /api/productos/:id -> admin (precio, imagen, etc.)
router.put('/productos/:id', requiereAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id inválido' });
    if (!(await db.getProducto(id))) return res.status(404).json({ error: 'Producto no encontrado' });

    const body = req.body || {};
    // validaciones defensivas de los campos editables
    if ('precio' in body && !(Number(body.precio) > 0))
      return res.status(400).json({ error: 'precio debe ser mayor a 0' });
    if ('categoria_id' in body) {
      const cid = Number(body.categoria_id);
      if (!Number.isInteger(cid) || !(await db.getCategorias()).some(c => c.id === cid))
        return res.status(400).json({ error: 'categoria_id no existe' });
    }
    if ('nombre' in body && !String(body.nombre || '').trim())
      return res.status(400).json({ error: 'nombre no puede quedar vacío' });

    const ok = await db.updateProducto(id, body);
    if (!ok) return res.status(400).json({ error: 'Sin campos para actualizar' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// DELETE /api/productos/:id -> admin (borrado lógico en SQL Server)
router.delete('/productos/:id', requiereAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id inválido' });
    if (!(await db.getProducto(id))) return res.status(404).json({ error: 'Producto no encontrado' });
    await db.deleteProducto(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
