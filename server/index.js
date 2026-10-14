// Servidor principal: Express + capa de datos intercambiable (SQLite / SQL Server).
// Sirve el frontend estático y la API REST en local.
try { require('dotenv').config(); } catch (_) { /* dotenv opcional */ }
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Frontend estático (public/) — diseño original intacto (colores/tamaños)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Imágenes subidas por el admin
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/catalogo'));
app.use('/api/pedidos', require('./routes/pedidos'));

// 404 de API en JSON
app.use('/api', (req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

// Manejador central de errores: nunca reventar el server ni filtrar stacks
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  const driver = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
  app.listen(PORT, () =>
    console.log(`🛍️  Tienda local en http://localhost:${PORT}  (BD: ${driver === 'mssql' ? 'SQL Server' : 'SQLite'})`));
}
module.exports = app;
