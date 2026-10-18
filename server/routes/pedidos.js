// API de pedidos: creación pública (cliente), listado/gestión solo admin.
const express = require('express');
const db = require('../db-instance');
const { requiereAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/pedidos -> público (el cliente finaliza su compra)
router.post('/', async (req, res, next) => {
  try {
    const { cliente, telefono = '', items = [], dedicatoria = '', entrega = '' } = req.body || {};
    if (!cliente || !String(cliente).trim())
      return res.status(400).json({ error: 'Nombre del cliente requerido' });
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: 'El carrito está vacío' });
    // El servidor recalcula precios/total desde la BD (nunca confía en el front):
    // sp_crear_pedido / transacción SQLite ignoran precios enviados por el cliente.
    const r = await db.crearPedido({
      cliente: String(cliente).trim(), telefono, dedicatoria, entrega,
      items: items.map(it => ({ id: Number(it.id), cantidad: Math.max(1, parseInt(it.cantidad) || 1) }))
    });
    res.status(201).json({ id: r.id, total: r.total });
  } catch (e) {
    if (/no est[aá]n disponibles|carrito est[aá] vac[ií]o|cliente requerido/i.test(e.message))
      return res.status(400).json({ error: e.message });
    next(e);
  }
});

// GET /api/pedidos -> admin
router.get('/', requiereAdmin, async (req, res, next) => {
  try { res.json(await db.getPedidos()); } catch (e) { next(e); }
});

// GET /api/pedidos/:id/comprobante.pdf -> público: descarga del comprobante
router.get('/:id/comprobante.pdf', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id inválido' });
    const pedido = await db.getPedido(id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    const { generarComprobantePdf } = require('../pdf');
    const pdf = generarComprobantePdf(pedido);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="comprobante-${id}.pdf"`);
    res.send(pdf);
  } catch (e) { next(e); }
});

// PATCH /api/pedidos/:id/estado -> admin (confirmar/anular)
router.patch('/:id/estado', requiereAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id inválido' });
    const { estado } = req.body || {};
    const r = await db.actualizarEstadoPedido(id, estado);
    if (r && r.invalid) return res.status(400).json({ error: 'Estado inválido' });
    if (r && r.notFound) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
