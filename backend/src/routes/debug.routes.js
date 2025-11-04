// Rutas de debug y cache - herramientas administrativas
const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');
const { limiterDatos, limiterEscritura } = require('../config/security');

// Middleware de autenticación admin
const isAdmin = (req) => {
  return req.headers['x-admin-key'] === process.env.ADMIN_KEY || 
         req.query.admin_key === process.env.ADMIN_KEY;
};

const requireAdmin = (req, res, next) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

/**
 * GET /api/debug/topology/:networkId
 * Análisis detallado de topología y LLDP
 * Query params: forceLldpRefresh (boolean)
 * Requiere admin
 */
router.get('/topology/:networkId', requireAdmin, limiterDatos, debugController.analyzeTopology);

/**
 * GET /api/debug/snapshot/:networkId
 * Snapshot de datos crudos para inspección
 * Requiere admin
 */
router.get('/snapshot/:networkId', requireAdmin, debugController.debugSnapshot);

/**
 * POST /api/cache/clear
 * Limpiar caché por tipo o completo
 * Body/Query params: networkId, kind (lldp, all)
 * Requiere admin
 */
router.post('/clear', requireAdmin, limiterEscritura, debugController.clearCache);

module.exports = router;
