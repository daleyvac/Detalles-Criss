// Rutas de autenticación (login/logout del administrador)
const express = require('express');
const { login, logout } = require('../middleware/auth');
const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);

module.exports = router;
