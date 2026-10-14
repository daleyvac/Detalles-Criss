// Autenticación por token simple (sesión de admin)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

const sesiones = new Map(); // token -> { usuario, rol }

function login(req, res) {
  const { usuario, password } = req.body || {};
  const u = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario || '');
  if (!u || !bcrypt.compareSync(password || '', u.password_hash))
    return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, { usuario: u.usuario, rol: u.rol });
  res.json({ token, rol: u.rol, usuario: u.usuario });
}

function logout(req, res) {
  sesiones.delete(req.headers.authorization?.replace('Bearer ', ''));
  res.json({ ok: true });
}

function requiereAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const s = sesiones.get(token);
  if (!s || s.rol !== 'admin') return res.status(403).json({ error: 'Se requiere sesión de administrador' });
  req.usuario = s;
  next();
}

module.exports = { login, logout, requiereAdmin };
