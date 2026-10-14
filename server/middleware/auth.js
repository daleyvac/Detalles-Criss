// Autenticación por token de sesión (rol admin). Asíncrono: compatible SQLite/SQL Server.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db-instance');

const sesiones = new Map(); // token -> { usuario, rol }
const TTL_MS = 8 * 60 * 60 * 1000; // expiración de sesión: 8 horas

function crearToken(sesion) {
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, { ...sesion, expira: Date.now() + TTL_MS });
  return token;
}

async function login(req, res, next) {
  try {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) return res.status(401).json({ error: 'Credenciales inválidas' });
    const u = await db.getUser(String(usuario).trim());
    if (!u || !(await bcrypt.compare(String(password), u.password_hash)))
      return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = crearToken({ usuario: u.usuario, rol: u.rol });
    res.json({ token, rol: u.rol, usuario: u.usuario });
  } catch (e) { next(e); }
}

function logout(req, res) {
  sesiones.delete((req.headers.authorization || '').replace('Bearer ', ''));
  res.json({ ok: true });
}

function requiereAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const s = sesiones.get(token);
  if (!s || s.rol !== 'admin' || s.expira < Date.now()) {
    if (s) sesiones.delete(token);
    return res.status(403).json({ error: 'Se requiere sesión de administrador' });
  }
  req.usuario = s;
  next();
}

module.exports = { login, logout, requiereAdmin };
