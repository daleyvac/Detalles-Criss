// API de pedidos: creación pública (cliente), listado/gestión solo admin
const express = require('express');
const db = require('../db');
const { requiereAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/pedidos -> público (el cliente finaliza su compra)
router.post('/', (req, res) => {
  const { cliente, telefono = '', items = [], dedicatoria = '', entrega = '' } = req.body || {};
  if (!cliente || !cliente.trim()) return res.status(400).json({ error: 'Nombre del cliente requerido' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'El carrito está vacío' });

  // Recalcular precios desde la BD (nunca confiar en el front)
  const getProd = db.prepare('SELECT id, nombre, precio FROM productos WHERE id = ?');
  const detalle = [];
  let total = 0;
  for (const it of items) {
    const p = getProd.get(it.id);
    if (!p) return res.status(400).json({ error: `Producto no disponible: id ${it.id}` });
    const cant = Math.max(1, parseInt(it.cantidad) || 1);
    const subtotal = +(p.precio * cant).toFixed(2);
    detalle.push({ id: p.id, nombre: p.nombre, cantidad: cant, precio: p.precio, subtotal });
    total += subtotal;
  }

  const r = db.prepare(`INSERT INTO pedidos (cliente, telefono, detalle, total, dedicatoria, entrega)
                        VALUES (?,?,?,?,?,?)`)
    .run(cliente.trim(), telefono, JSON.stringify(detalle), +total.toFixed(2), dedicatoria, entrega);
  res.status(201).json({ id: r.lastInsertRowid, total: +total.toFixed(2) });
});

// GET /api/pedidos -> admin
router.get('/', requiereAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM pedidos ORDER BY id DESC').all();
  rows.forEach(p => p.detalle = JSON.parse(p.detalle));
  res.json(rows);
});

// PATCH /api/pedidos/:id/estado -> admin (confirmar/anular)
router.patch('/:id/estado', requiereAdmin, (req, res) => {
  const { estado } = req.body || {};
  if (!['pendiente', 'confirmado', 'anulado'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido' });
  db.prepare('UPDATE pedidos SET estado = ? WHERE id = ?').run(estado, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
