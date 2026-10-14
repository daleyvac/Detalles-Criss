// API del catálogo: categorías y productos (lectura pública, escritura solo admin)
const express = require('express');
const db = require('../db');
const { requiereAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/categorias  -> pública
router.get('/categorias', (req, res) => {
  res.json(db.prepare('SELECT * FROM categorias ORDER BY nombre').all());
});

// POST /api/categorias -> admin
router.post('/categorias', requiereAdmin, (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const r = db.prepare('INSERT INTO categorias (nombre) VALUES (?)').run(nombre.trim());
    res.status(201).json({ id: r.lastInsertRowid, nombre: nombre.trim() });
  } catch {
    res.status(409).json({ error: 'La categoría ya existe' });
  }
});

// DELETE /api/categorias/:id -> admin (bloqueado si tiene productos)
router.delete('/categorias/:id', requiereAdmin, (req, res) => {
  const enUso = db.prepare('SELECT COUNT(*) c FROM productos WHERE categoria_id = ?').get(req.params.id).c;
  if (enUso > 0) return res.status(400).json({ error: 'No se puede eliminar: tiene productos asociados' });
  db.prepare('DELETE FROM categorias WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET /api/productos -> pública (con nombre de categoría)
router.get('/productos', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, c.nombre AS categoria FROM productos p
    JOIN categorias c ON c.id = p.categoria_id
    ORDER BY c.nombre, p.nombre`).all();
  res.json(rows);
});

// POST /api/productos -> admin
router.post('/productos', requiereAdmin, (req, res) => {
  const { nombre, categoria_id, precio, imagen = '', descripcion = '' } = req.body || {};
  if (!nombre || !categoria_id || !(precio > 0))
    return res.status(400).json({ error: 'nombre, categoria_id y precio (>0) son requeridos' });
  const r = db.prepare('INSERT INTO productos (nombre, categoria_id, precio, imagen, descripcion) VALUES (?,?,?,?,?)')
    .run(nombre.trim(), categoria_id, precio, imagen, descripcion);
  res.status(201).json({ id: r.lastInsertRowid });
});

// PUT /api/productos/:id -> admin (precio, imagen, etc.)
router.put('/productos/:id', requiereAdmin, (req, res) => {
  const campos = ['nombre', 'categoria_id', 'precio', 'imagen', 'descripcion'];
  const sets = [], vals = [];
  for (const c of campos) if (c in (req.body || {})) { sets.push(`${c} = ?`); vals.push(req.body[c]); }
  if (!sets.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
  vals.push(req.params.id);
  db.prepare(`UPDATE productos SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ ok: true });
});

// DELETE /api/productos/:id -> admin
router.delete('/productos/:id', requiereAdmin, (req, res) => {
  db.prepare('DELETE FROM productos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
