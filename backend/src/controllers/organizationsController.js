// Controlador de organizations - endpoints organizacionales de Meraki
const {
  getOrgWirelessDevicesRadsecAuthorities,
  getOrgTopAppliancesByUtilization,
  getOrgDevicesUplinksAddressesByDevice,
  getOrganizationUplinksStatuses
} = require('../merakiApi');

const { logger } = require('../config/logger');

/**
 * Obtener autoridades de certificados RADSEC
 */
exports.getRadsecAuthorities = async (req, res) => {
  try {
    const { orgId } = req.params;
    const data = await getOrgWirelessDevicesRadsecAuthorities(orgId);
    res.json(data);
  } catch (error) {
    logger.error('Error /org/wireless/radsec/authorities', { data: error.response?.data || error.message });
    res.status(500).json({ error: 'Error obteniendo autoridades RADSEC' });
  }
};

/**
 * Top appliances por utilización
 */
exports.getTopAppliances = async (req, res) => {
  try {
    const { orgId } = req.params;
    const data = await getOrgTopAppliancesByUtilization(orgId, req.query || {});
    res.json(data);
  } catch (error) {
    logger.error('Error /organizations/:orgId/appliances/top-utilization', { data: error.response?.data || error.message });
    res.status(500).json({ error: 'Error obteniendo ranking de appliances' });
  }
};

/**
 * Direcciones de uplinks por dispositivo
 */
exports.getUplinksAddresses = async (req, res) => {
  try {
    const { orgId } = req.params;
    const data = await getOrgDevicesUplinksAddressesByDevice(orgId, req.query || {});
    res.json(data);
  } catch (error) {
    logger.error('Error /organizations/:orgId/devices/uplinks-addresses', { data: error.response?.data || error.message });
    res.status(500).json({ error: 'Error obteniendo direcciones de uplinks' });
  }
};

/**
 * Estados de uplinks de la organización
 */
exports.getUplinksStatuses = async (req, res) => {
  try {
    const { orgId } = req.params;
    const data = await getOrganizationUplinksStatuses(orgId, req.query || {});
    res.json(data);
  } catch (error) {
    logger.error('Error /organizations/:orgId/uplinks/statuses', { data: error.response?.data || error.message });
    res.status(500).json({ error: 'Error obteniendo estados de uplinks' });
  }
};
