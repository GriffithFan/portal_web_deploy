// Rutas de autenticación
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { limiterAuth } = require('../middleware/security');

/**
 * POST /api/login
 * Login de técnicos
 */
router.post('/login', limiterAuth, authController.loginTecnico);

/**
 * POST /api/admin/login
 * Login de administradores
 */
router.post('/admin/login', limiterAuth, authController.loginAdmin);

module.exports = router;
