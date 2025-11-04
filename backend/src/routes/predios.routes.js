// Rutas de predios - gestión del catálogo CSV
const express = require('express');
const router = express.Router();
const prediosController = require('../controllers/prediosController');
const { limiterEscritura } = require('../config/security');

// Verificar si es admin
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
 * GET /api/predios/search
 * Buscar predios con filtros opcionales
 * Query params: region, estado, organization_id, q (búsqueda texto)
 */
router.get('/search', prediosController.searchPredios);

/**
 * GET /api/predios/stats
 * Obtener estadísticas del catálogo
 * Requiere autenticación admin
 */
router.get('/stats', requireAdmin, prediosController.getStats);

/**
 * POST /api/predios/refresh
 * Refrescar caché en memoria desde CSV
 * Requiere autenticación admin
 */
router.post('/refresh', requireAdmin, limiterEscritura, prediosController.refreshCache);

/**
 * POST /api/predios/sync
 * Sincronizar CSV completo desde Meraki API
 * Requiere autenticación admin
 */
router.post('/sync', requireAdmin, limiterEscritura, prediosController.syncPredios);

/**
 * POST /api/predios/sync-stream
 * Sincronizar con Server-Sent Events (progreso en tiempo real)
 * Requiere autenticación admin
 */
router.post('/sync-stream', requireAdmin, limiterEscritura, prediosController.syncPrediosStream);

/**
 * GET /api/predios/last-sync
 * Obtener resumen de última sincronización
 * Requiere autenticación admin
 */
router.get('/last-sync', requireAdmin, prediosController.getLastSync);

/**
 * GET /api/predios/:code
 * Buscar predio por código
 */
router.get('/:code', prediosController.getPredioByCode);

module.exports = router;
