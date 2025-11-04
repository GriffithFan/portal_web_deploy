// Router central - Integra todas las rutas modulares
const express = require('express');
const router = express.Router();

// Importar rutas modulares
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const prediosRoutes = require('./predios.routes');
const networksRoutes = require('./networks.routes');
const debugRoutes = require('./debug.routes');
const organizationsRoutes = require('./organizations.routes');

// Registrar rutas
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/predios', prediosRoutes);
router.use('/networks', networksRoutes);
router.use('/debug', debugRoutes);
router.use('/cache', debugRoutes); // Cache usa el mismo controller de debug
router.use('/organizations', organizationsRoutes);

// Endpoint raíz para resolve-network (mantener en raíz de /api)
const networksController = require('../controllers/networksController');
router.get('/resolve-network', networksController.resolveNetwork);

module.exports = router;
