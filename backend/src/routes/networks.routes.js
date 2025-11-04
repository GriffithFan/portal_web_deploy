// Rutas de networks - búsqueda, resolución, topología, dispositivos
const express = require('express');
const router = express.Router();
const networksController = require('../controllers/networksController');
const { limiterDatos } = require('../config/security');

/**
 * GET /api/networks/search
 * Buscar networks con filtros
 * Query params: q (búsqueda texto)
 */
router.get('/search', networksController.searchNetworks);

/**
 * GET /api/resolve-network
 * Resolver predio por código, número o nombre
 * Query params: q (código/nombre del predio)
 */
router.get('/resolve-network', networksController.resolveNetwork);

/**
 * GET /api/networks/:networkId/section/:sectionKey
 * Carga lazy por sección
 * Secciones: topology, switches, access_points
 */
router.get('/:networkId/section/:sectionKey', limiterDatos, networksController.getNetworkSection);

/**
 * GET /api/networks/:networkId/summary
 * Obtener resumen del network
 */
router.get('/:networkId/summary', limiterDatos, networksController.getNetworkSummary);

/**
 * GET /api/networks/:networkId/topology_discovery
 * Topology vía discovery-by-device (fallback alternativo)
 */
router.get('/:networkId/topology_discovery', limiterDatos, networksController.getTopologyDiscovery);

/**
 * GET /api/networks/:networkId/appliance/connectivityMonitoringDestinations
 * Appliance connectivity monitoring destinations
 */
router.get('/:networkId/appliance/connectivityMonitoringDestinations', networksController.getApplianceConnectivityMonitoring);

/**
 * GET /api/networks/:networkId/appliance/historical
 * Datos históricos del appliance (connectivity + bandwidth)
 */
router.get('/:networkId/appliance/historical', networksController.getApplianceHistorical);

/**
 * GET /api/networks/:networkId/wireless/ssids
 * Lista de SSIDs wireless
 */
router.get('/:networkId/wireless/ssids', networksController.getWirelessSSIDs);

/**
 * GET /api/networks/:networkId/wireless/ssids/:number
 * SSID wireless por número
 */
router.get('/:networkId/wireless/ssids/:number', networksController.getWirelessSSID);

/**
 * GET /api/networks/:networkId/:section
 * Endpoint legacy para compatibilidad
 */
router.get('/:networkId/:section', networksController.getNetworkLegacySection);

module.exports = router;
