// Rutas de organizations - datos organizacionales de Meraki
const express = require('express');
const router = express.Router();
const organizationsController = require('../controllers/organizationsController');

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
 * GET /api/organizations/:orgId/wireless/devices/radsec/certificates/authorities
 * Autoridades de certificados RADSEC
 */
router.get('/:orgId/wireless/devices/radsec/certificates/authorities', organizationsController.getRadsecAuthorities);

/**
 * GET /api/organizations/:orgId/appliances/top-utilization
 * Top appliances por utilización
 * Requiere admin
 */
router.get('/:orgId/appliances/top-utilization', requireAdmin, organizationsController.getTopAppliances);

/**
 * GET /api/organizations/:orgId/devices/uplinks-addresses
 * Direcciones de uplinks por dispositivo
 * Requiere admin
 */
router.get('/:orgId/devices/uplinks-addresses', requireAdmin, organizationsController.getUplinksAddresses);

/**
 * GET /api/organizations/:orgId/uplinks/statuses
 * Estados de uplinks de la organización
 * Requiere admin
 */
router.get('/:orgId/uplinks/statuses', requireAdmin, organizationsController.getUplinksStatuses);

module.exports = router;
