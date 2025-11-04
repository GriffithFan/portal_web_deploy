// Rutas administrativas - gestión de técnicos
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { limiterEscritura } = require('../middleware/security');

/**
 * GET /api/tecnicos
 * Listar todos los técnicos
 */
router.get(
  '/tecnicos',
  authController.requireAdmin,
  authController.listarTecnicos
);

/**
 * POST /api/tecnicos
 * Agregar un nuevo técnico
 */
router.post(
  '/tecnicos',
  authController.requireAdmin,
  limiterEscritura,
  authController.agregarTecnico
);

/**
 * DELETE /api/tecnicos/:username
 * Eliminar un técnico
 */
router.delete(
  '/tecnicos/:username',
  authController.requireAdmin,
  limiterEscritura,
  authController.eliminarTecnico
);

module.exports = router;
