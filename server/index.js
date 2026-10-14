// Servidor principal: Express + SQLite, sirve frontend estático y API REST local
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Frontend estático (public/) — sin cambiar colores/tamaños: se copió el HTML/CSS/JS tal cual
app.use(express.static(path.join(__dirname, '..', 'public')));

// Imágenes subidas por el admin
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/catalogo'));
app.use('/api/pedidos', require('./routes/pedidos'));

// 404 de API en JSON
app.use('/api', (req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`🛍️  Tienda local corriendo en http://localhost:${PORT}`));
}
module.exports = app;
