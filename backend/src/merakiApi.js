const axios = require('axios');

const MERAKI_API_KEY = process.env.MERAKI_API_KEY || '';
const BASE_URL = process.env.MERAKI_BASE_URL || 'https://api.meraki.com/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'X-Cisco-Meraki-API-Key': MERAKI_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

function parseNextCursor(linkHeader) {
  if (!linkHeader) return null;
  const source = Array.isArray(linkHeader) ? linkHeader.join(',') : linkHeader;
  const segments = source.split(',');
  for (const segment of segments) {
    const [rawUrl, ...rest] = segment.split(';').map((part) => part.trim());
    if (!rawUrl) continue;
    const isNext = rest.some((item) => /rel="?next"?/i.test(item));
    if (!isNext) continue;
    const match = rawUrl.match(/startingAfter=([^&>]+)/i) || rawUrl.match(/starting_after=([^&>]+)/i);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

function getNextCursorFromHeaders(headers = {}) {
  const direct = headers['x-next-page-starting-after']
    || headers['x-next-starting-after']
    || headers['x-next-page-cursor']
    || headers['x-page-next'];
  if (direct) return direct;
  return parseNextCursor(headers.link || headers.Link);
}

async function fetchAllPages(path, params = {}, { perPage = 1000, maxPages = 100 } = {}) {
  const results = [];
  let cursor = params.startingAfter;
  let page = 0;

  while (page < maxPages) {
    const query = { ...params, perPage };
    if (cursor) query.startingAfter = cursor;

    const response = await client.get(path, { params: query });
    const { data, headers } = response;

    if (Array.isArray(data)) {
      results.push(...data);
    } else if (data && Array.isArray(data.items)) {
      results.push(...data.items);
    } else if (data) {
      results.push(data);
    }

    const nextCursor = getNextCursorFromHeaders(headers);
    if (!nextCursor || nextCursor === cursor) {
      break;
    }
    cursor = nextCursor;
    page += 1;
  }

  return results;
}

if (!MERAKI_API_KEY) {
  // Aviso temprano en logs para evitar confusión cuando falte la API key
  // No lanzamos excepción aquí para que el servidor levante, pero las llamadas a Meraki fallarán con 401/403
  console.warn('[merakiApi] MERAKI_API_KEY no está configurada en .env. Configúrala para que las llamadas a la API de Meraki funcionen.');
}

async function getOrganizations() {
  const { data } = await client.get('/organizations');
  return data;
}

async function getNetworks(organizationId) {
  return fetchAllPages(`/organizations/${organizationId}/networks`, {}, { perPage: 1000 });
}

async function getNetworkDevices(networkId) {
  const { data } = await client.get(`/networks/${networkId}/devices`);
  return data;
}

async function getNetworkInfo(networkId) {
  const { data } = await client.get(`/networks/${networkId}`);
  return data;
}

async function getNetworkTopology(networkId) {
  // Algunos tenants tienen este endpoint habilitado
  const { data } = await client.get(`/networks/${networkId}/topology`);
  return data;
}

async function getNetworkTopologyLinkLayer(networkId) {
  const { data } = await client.get(`/networks/${networkId}/topology/linkLayer`);
  return data;
}

async function getNetworkTopologyNetworkLayer(networkId) {
  const { data } = await client.get(`/networks/${networkId}/topology/networkLayer`);
  return data;
}

async function getOrganizationDevicesStatuses(organizationId, params = {}) {
  // Permite filtrar por networkIds[] conservando paginación básica
  const { data } = await client.get(`/organizations/${organizationId}/devices/statuses`, {
    params
  });
  return data;
}

async function getApplianceStatuses(networkId) {
  // Probar plural/singular por diferencias entre tenants o documentación
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/uplinks/statuses`);
    return data;
  } catch (e) {
    if (e.response && e.response.status === 404) {
      console.warn(`[merakiApi] Fallback: /appliance/uplinks/statuses no encontrado para ${networkId}, intentando /appliance/uplink/statuses`);
      const { data } = await client.get(`/networks/${networkId}/appliance/uplink/statuses`);
      return data;
    }
    // Si el error no es 404, lo relanzamos
    throw e;
  }
}

// Alternativa: estados de uplinks a nivel organización (permite filtrar por networkIds[])
async function getOrgApplianceUplinksStatuses(organizationId, params = {}) {
  try {
    const { data } = await client.get(`/organizations/${organizationId}/appliance/uplinks/statuses`, { params });
    return data;
  } catch (e) {
    const { data } = await client.get(`/organizations/${organizationId}/appliance/uplink/statuses`, { params });
    return data;
  }
}

async function getOrgTopAppliancesByUtilization(organizationId, params = {}) {
  const { data } = await client.get(`/organizations/${organizationId}/summary/top/appliances/byUtilization`, { params });
  return data;
}

async function getOrgDevicesUplinksAddressesByDevice(organizationId, params = {}) {
  const { data } = await client.get(`/organizations/${organizationId}/devices/uplinks/addresses/byDevice`, { params });
  return data;
}

async function getOrganizationUplinksStatuses(organizationId, params = {}) {
  const { data } = await client.get(`/organizations/${organizationId}/uplinks/statuses`, { params });
  return data;
}

// Extra endpoints shared by user
async function getOrgSwitchPortsTopologyDiscoveryByDevice(organizationId) {
  const { data } = await client.get(`/organizations/${organizationId}/switch/ports/topology/discovery/byDevice`);
  return data;
}

async function getNetworkApplianceConnectivityMonitoringDestinations(networkId) {
  const { data } = await client.get(`/networks/${networkId}/appliance/connectivityMonitoringDestinations`);
  return data;
}

async function getNetworkWirelessSSIDs(networkId) {
  const { data } = await client.get(`/networks/${networkId}/wireless/ssids`);
  return data;
}

async function getNetworkWirelessSSID(networkId, number) {
  const { data } = await client.get(`/networks/${networkId}/wireless/ssids/${number}`);
  return data;
}

async function getOrgWirelessDevicesRadsecAuthorities(organizationId) {
  const { data } = await client.get(`/organizations/${organizationId}/wireless/devices/radsec/certificates/authorities`);
  return data;
}

async function getOrgWirelessSignalQualityByNetwork(organizationId, params = {}) {
  const { data } = await client.get(`/organizations/${organizationId}/wireless/devices/signalQuality/byNetwork`, { params });
  return data;
}

async function getOrgWirelessSignalQualityByDevice(organizationId, params = {}) {
  const { data } = await client.get(`/organizations/${organizationId}/wireless/devices/signalQuality/byDevice`, { params });
  return data;
}

async function getOrgWirelessSignalQualityByClient(organizationId, params = {}) {
  const { data } = await client.get(`/organizations/${organizationId}/wireless/devices/signalQuality/byClient`, { params });
  return data;
}

async function getNetworkWirelessSignalQualityHistory(networkId, params = {}) {
  const { data } = await client.get(`/networks/${networkId}/wireless/signalQualityHistory`, { params });
  return data;
}

async function getDeviceLldpCdp(serial) {
  try {
    const { data } = await client.get(`/devices/${serial}/lldpCdp`);
    return data;
  } catch (e) {
    // Algunos listados utilizan la barra intermedia
    const { data } = await client.get(`/devices/${serial}/lldp/cdp`);
    return data;
  }
}

async function getNetworkSwitchPortsStatuses(networkId) {
  const { data } = await client.get(`/networks/${networkId}/switch/ports/statuses`, { params: { perPage: 1000 } });
  return data;
}

async function getDeviceSwitchPortsStatuses(serial) {
  return fetchAllPages(`/devices/${serial}/switch/ports/statuses`, {}, { perPage: 1000 });
}

// Endpoints adicionales para información detallada del appliance
async function getAppliancePerformance(networkId, timespan = 3600) {
  const { data } = await client.get(`/networks/${networkId}/appliance/performance`, { 
    params: { timespan, resolution: 300 }
  });
  return data;
}

async function getApplianceUplinks(networkId) {
  const { data } = await client.get(`/networks/${networkId}/appliance/uplinks`);
  return data;
}

async function getDeviceUplink(serial) {
  const { data } = await client.get(`/devices/${serial}/uplink`);
  return data;
}

async function getApplianceClientSecurity(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/security/intrusion`);
    return data;
  } catch {
    return null;
  }
}

async function getOrganizationApplianceSecurityIntrusion(organizationId) {
  try {
    const { data } = await client.get(`/organizations/${organizationId}/appliance/security/intrusion`);
    return data;
  } catch {
    return null;
  }
}

async function getNetworkApplianceSecurityMalware(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/security/malware`);
    return data;
  } catch {
    return null;
  }
}

async function getApplianceTrafficShaping(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/trafficShaping`);
    return data;
  } catch {
    return null;
  }
}

async function getNetworkClientsBandwidthUsage(networkId, timespan = 3600) {
  try {
    const { data } = await client.get(`/networks/${networkId}/clients/bandwidthUsageHistory`, {
      params: { timespan, resolution: 300 }
    });
    return data;
  } catch {
    return [];
  }
}

async function getAppliancePorts(networkId) {
  const { data } = await client.get(`/networks/${networkId}/appliance/ports`);
  return data;
}

async function getDeviceAppliancePortsStatuses(serial) {
  try {
    const { data } = await client.get(`/devices/${serial}/appliance/ports/statuses`);
    return data;
  } catch (error) {
    if (error?.response?.status === 404) {
      console.warn(`[merakiApi] /devices/${serial}/appliance/ports/statuses no disponible, probando endpoint alternativo`);
      const { data } = await client.get(`/devices/${serial}/appliance/ports/status`);
      return data;
    }
    throw error;
  }
}

async function getOrgApplianceUplinksLossAndLatency(organizationId, params = {}) {
  try {
    const { data } = await client.get(`/organizations/${organizationId}/appliance/uplinks/lossAndLatency`, { params });
    return data;
  } catch (error) {
    if (error?.response?.status === 404) {
      console.warn('[merakiApi] Endpoint lossAndLatency no disponible, omitiendo timeseries de conectividad');
      return [];
    }
    throw error;
  }
}

async function getOrgApplianceUplinksUsageByDevice(organizationId, params = {}) {
  try {
    const { data } = await client.get(`/organizations/${organizationId}/appliance/uplinks/usage/byDevice`, { params });
    return data;
  } catch (error) {
    if (error?.response?.status === 404) {
      console.warn('[merakiApi] Endpoint usage/byDevice no disponible, omitiendo métricas de uso por uplink');
      return [];
    }
    throw error;
  }
}

async function getDeviceSwitchPorts(serial) {
  const { data } = await client.get(`/devices/${serial}/switch/ports`);
  return data;
}

async function getDeviceSwitchPort(serial, portId) {
  const { data } = await client.get(`/devices/${serial}/switch/ports/${portId}`);
  return data;
}

// Nuevos endpoints para mejorar información de switches
async function getNetworkSwitchAccessControlLists(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/switch/accessControlLists`);
    return data;
  } catch (error) {
    console.error(`Error fetching switch ACLs for network ${networkId}:`, error.message);
    return { rules: [] };
  }
}

async function getOrgSwitchPortsBySwitch(organizationId) {
  try {
    const { data } = await client.get(`/organizations/${organizationId}/switch/ports/bySwitch`, {
      params: { perPage: 1000 }
    });
    return data;
  } catch (error) {
    console.error(`Error fetching switch ports by switch:`, error.message);
    return [];
  }
}

async function getNetworkSwitchStackRoutingInterfaces(networkId, switchStackId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/switch/stacks/${switchStackId}/routing/interfaces`);
    return data;
  } catch (error) {
    console.error(`Error fetching switch stack routing interfaces:`, error.message);
    return [];
  }
}

// Nuevos endpoints para mejores métricas de conectividad y wireless
async function getNetworkCellularGatewayConnectivityMonitoringDestinations(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/cellularGateway/connectivityMonitoringDestinations`);
    return data;
  } catch (error) {
    console.error(`Error fetching cellular gateway connectivity destinations for network ${networkId}:`, error.message);
    return { destinations: [] };
  }
}

async function getDeviceWirelessConnectionStats(serial, params = {}) {
  try {
    const { data } = await client.get(`/devices/${serial}/wireless/connectionStats`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching wireless connection stats for device ${serial}:`, error.message);
    return null;
  }
}

async function getNetworkWirelessConnectionStats(networkId, params = {}) {
  try {
    // Parámetros opcionales: t0, t1, timespan, band, ssid, vlan, apTag
    const { data } = await client.get(`/networks/${networkId}/wireless/connectionStats`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching network wireless connection stats for ${networkId}:`, error.message);
    return null;
  }
}

async function getNetworkWirelessLatencyStats(networkId, params = {}) {
  try {
    const { data } = await client.get(`/networks/${networkId}/wireless/latencyStats`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching wireless latency stats:`, error.message);
    return null;
  }
}

async function getDeviceWirelessLatencyStats(serial, params = {}) {
  try {
    const { data } = await client.get(`/devices/${serial}/wireless/latencyStats`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching device wireless latency stats:`, error.message);
    return null;
  }
}

async function getNetworkWirelessFailedConnections(networkId, params = {}) {
  try {
    const { data } = await client.get(`/networks/${networkId}/wireless/failedConnections`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching wireless failed connections:`, error.message);
    return [];
  }
}

// ============================================================================
// NUEVOS ENDPOINTS PARA ENRIQUECIMIENTO DE DATOS
// ============================================================================

async function getDeviceLossAndLatencyHistory(serial, params = {}) {
  try {
    // Parámetros: ip (required), t0, t1, timespan, resolution, uplink
    const { data } = await client.get(`/devices/${serial}/lossAndLatencyHistory`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching loss and latency history for device ${serial}:`, error.message);
    return null;
  }
}

async function getOrgDevicesUplinksLossAndLatency(organizationId, params = {}) {
  try {
    // Parámetros: t0, t1, timespan, uplink, ip
    const { data } = await client.get(`/organizations/${organizationId}/devices/uplinksLossAndLatency`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching org uplinks loss and latency for org ${organizationId}:`, error.message);
    return [];
  }
}

async function getOrgWirelessDevicesPacketLossByClient(organizationId, params = {}) {
  try {
    // Parámetros: networkIds[], serials[], ssids[], bands[], t0, t1, timespan
    const { data } = await client.get(`/organizations/${organizationId}/wireless/devices/packetLoss/byClient`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching wireless packet loss by client:`, error.message);
    return [];
  }
}

async function getOrgWirelessDevicesPacketLossByDevice(organizationId, params = {}) {
  try {
    // Parámetros: networkIds[], serials[], ssids[], bands[], t0, t1, timespan
    const { data } = await client.get(`/organizations/${organizationId}/wireless/devices/packetLoss/byDevice`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching wireless packet loss by device:`, error.message);
    return [];
  }
}

async function getNetworkApplianceConnectivityMonitoringDests(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/connectivityMonitoringDestinations`);
    return data;
  } catch (error) {
    console.error(`Error fetching appliance connectivity monitoring destinations:`, error.message);
    return null;
  }
}

async function getNetworkAppliancePortsConfig(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/ports`);
    return data;
  } catch (error) {
    console.error(`Error fetching appliance ports config:`, error.message);
    return [];
  }
}

async function getOrgApplianceUplinkStatuses(organizationId, params = {}) {
  try {
    // Parámetros: networkIds[], serials[], iccids[]
    return fetchAllPages(`/organizations/${organizationId}/appliance/uplink/statuses`, params, { perPage: 1000 });
  } catch (error) {
    console.error(`Error fetching org appliance uplink statuses:`, error.message);
    return [];
  }
}

async function getNetworkApplianceVlans(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/vlans`);
    return data;
  } catch (error) {
    console.error(`Error fetching appliance VLANs:`, error.message);
    return [];
  }
}

async function getNetworkApplianceVlan(networkId, vlanId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/vlans/${vlanId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching appliance VLAN ${vlanId}:`, error.message);
    return null;
  }
}

async function getNetworkApplianceSettings(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/settings`);
    return data;
  } catch (error) {
    console.error(`Error fetching appliance settings:`, error.message);
    return null;
  }
}

async function getOrgApplianceSdwanInternetPolicies(organizationId) {
  try {
    const { data } = await client.get(`/organizations/${organizationId}/appliance/sdwan/internetPolicies`);
    return data;
  } catch (error) {
    console.error(`Error fetching SDWAN internet policies:`, error.message);
    return [];
  }
}

async function getOrgUplinksStatuses(organizationId, params = {}) {
  try {
    return fetchAllPages(`/organizations/${organizationId}/uplinks/statuses`, params, { perPage: 1000 });
  } catch (error) {
    console.error(`Error fetching org uplinks statuses:`, error.message);
    return [];
  }
}

async function getDeviceApplianceUplinksSettings(serial) {
  try {
    const { data } = await client.get(`/devices/${serial}/appliance/uplinks/settings`);
    return data;
  } catch (error) {
    console.error(`Error fetching appliance uplinks settings:`, error.message);
    return null;
  }
}

async function getNetworkApplianceTrafficShapingUplinkSelection(networkId) {
  try {
    const { data } = await client.get(`/networks/${networkId}/appliance/trafficShaping/uplinkSelection`);
    return data;
  } catch (error) {
    console.error(`Error fetching traffic shaping uplink selection:`, error.message);
    return null;
  }
}

async function getOrgApplianceUplinksUsageByNetwork(organizationId, params = {}) {
  try {
    // Parámetros: t0, t1, timespan
    const { data } = await client.get(`/organizations/${organizationId}/appliance/uplinks/usage/byNetwork`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching appliance uplinks usage by network:`, error.message);
    return [];
  }
}

async function getNetworkApplianceUplinksUsageHistory(networkId, params = {}) {
  try {
    // Parámetros: t0, t1, timespan, resolution
    const { data } = await client.get(`/networks/${networkId}/appliance/uplinks/usageHistory`, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching network uplinks usage history:`, error.message);
    return [];
  }
}

async function getOrgApplianceUplinksStatusesOverview(organizationId) {
  try {
    const { data } = await client.get(`/organizations/${organizationId}/appliance/uplinks/statuses/overview`);
    return data;
  } catch (error) {
    console.error(`Error fetching appliance uplinks statuses overview:`, error.message);
    return null;
  }
}

module.exports = {
  getOrganizations,
  getNetworks,
  getNetworkDevices,
  getNetworkInfo,
  getNetworkTopology,
  getNetworkTopologyLinkLayer,
  getNetworkTopologyNetworkLayer,
  getApplianceStatuses,
  getOrganizationDevicesStatuses,
  // extras
  getOrgSwitchPortsTopologyDiscoveryByDevice,
  getNetworkApplianceConnectivityMonitoringDestinations,
  getNetworkWirelessSSIDs,
  getNetworkWirelessSSID,
  getOrgWirelessDevicesRadsecAuthorities,
  getOrgWirelessSignalQualityByNetwork,
  getOrgWirelessSignalQualityByDevice,
  getOrgWirelessSignalQualityByClient,
  getDeviceLldpCdp,
  getNetworkSwitchPortsStatuses,
  getDeviceSwitchPortsStatuses,
  getNetworkWirelessSignalQualityHistory,
  getOrgApplianceUplinksStatuses,
  getOrgTopAppliancesByUtilization,
  getOrgDevicesUplinksAddressesByDevice,
  getOrganizationUplinksStatuses,
  // Nuevos endpoints para appliance detallado
  getAppliancePerformance,
  getApplianceUplinks,
  getDeviceUplink,
  getApplianceClientSecurity,
  getOrganizationApplianceSecurityIntrusion,
  getApplianceTrafficShaping,
  getNetworkClientsBandwidthUsage,
  getNetworkApplianceSecurityMalware,
  // Nuevos endpoints para puertos de appliance
  getAppliancePorts,
  getDeviceAppliancePortsStatuses,
  getOrgApplianceUplinksLossAndLatency,
  getOrgApplianceUplinksUsageByDevice,
  getDeviceSwitchPorts,
  getDeviceSwitchPort,
  // Nuevos endpoints para switches mejorados
  getNetworkSwitchAccessControlLists,
  getOrgSwitchPortsBySwitch,
  getNetworkSwitchStackRoutingInterfaces,
  // Nuevos endpoints para conectividad y wireless mejorados
  getNetworkCellularGatewayConnectivityMonitoringDestinations,
  getDeviceWirelessConnectionStats,
  getNetworkWirelessConnectionStats,
  getNetworkWirelessLatencyStats,
  getDeviceWirelessLatencyStats,
  getNetworkWirelessFailedConnections,
  // Nuevos endpoints para enriquecimiento (Loss & Latency, Packet Loss, etc.)
  getDeviceLossAndLatencyHistory,
  getOrgDevicesUplinksLossAndLatency,
  getOrgWirelessDevicesPacketLossByClient,
  getOrgWirelessDevicesPacketLossByDevice,
  getNetworkApplianceConnectivityMonitoringDests,
  getNetworkAppliancePortsConfig,
  getOrgApplianceUplinkStatuses,
  getNetworkApplianceVlans,
  getNetworkApplianceVlan,
  getNetworkApplianceSettings,
  getOrgApplianceSdwanInternetPolicies,
  getOrgUplinksStatuses,
  getDeviceApplianceUplinksSettings,
  getNetworkApplianceTrafficShapingUplinkSelection,
  getOrgApplianceUplinksUsageByNetwork,
  getNetworkApplianceUplinksUsageHistory,
  getOrgApplianceUplinksStatusesOverview
};
