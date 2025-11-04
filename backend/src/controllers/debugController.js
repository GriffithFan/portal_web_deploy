// Controlador de debug - herramientas para diagnóstico y testing
const {
  getNetworkDevices,
  getNetworkTopologyLinkLayer,
  getDeviceLldpCdp,
  getNetworkInfo,
  getApplianceStatuses,
  getOrgApplianceUplinksStatuses,
  getNetworkSwitchPortsStatuses
} = require('../merakiApi');

const { cache, getFromCache } = require('../warmCache');
const { logger, logAdmin } = require('../config/logger');

// Helper: resolver orgId para un network
async function resolveNetworkOrgId(networkId) {
  try {
    const cachedNet = getFromCache(cache.networkById, networkId);
    if (cachedNet && cachedNet.organizationId) return cachedNet.organizationId;
    
    const net = await getNetworkInfo(networkId);
    if (net.organizationId) return net.organizationId;
  } catch (e) {
    logger.error(`Error resolviendo orgId para ${networkId}: ${e.message}`);
  }
  return null;
}

/**
 * Análisis detallado de topología y LLDP
 * Útil para debug de conectividad switch → appliance
 */
exports.analyzeTopology = async (req, res) => {
  const { networkId } = req.params;
  
  try {
    logger.debug('Iniciando análisis de topología y LLDP...');
    
    const [devices, topology] = await Promise.all([
      getNetworkDevices(networkId),
      getNetworkTopologyLinkLayer(networkId)
    ]);
    
    const switches = devices.filter(d => d.model?.startsWith('MS'));
    const mxDevice = devices.find(d => d.model?.startsWith('MX'));
    
    logger.debug(`Switches: ${switches.length}, MX: ${mxDevice ? mxDevice.serial : 'NO ENCONTRADO'}`);
    
    // Obtener LLDP de cada switch
    const lldpData = {};
    const forceLldpRefresh = (req.query.forceLldpRefresh || '').toString().toLowerCase() === 'true' || 
                             (req.query.forceLldpRefresh || '').toString() === '1';
    const cachedLldpMap = !forceLldpRefresh && (getFromCache(cache.lldpByNetwork, networkId, 'lldp') || {});
    
    for (const sw of switches) {
      try {
        const lldpInfo = (cachedLldpMap && cachedLldpMap[sw.serial]) || await getDeviceLldpCdp(sw.serial);
        lldpData[sw.serial] = lldpInfo;
        logger.debug(`${sw.name} (${sw.serial}) - puertos LLDP: ${Object.keys(lldpInfo?.ports || {}).length}`);
      } catch (err) {
        logger.error(`Error LLDP para ${sw.serial}:`, { error: err.message });
      }
    }
    
    // Analizar topología para encontrar conexiones switch → MX
    const topologyAnalysis = [];
    if (topology && topology.links && mxDevice) {
      const mxSerial = mxDevice.serial.toUpperCase();
      logger.debug(`Analizando ${topology.links.length} enlaces en topología...`);
      
      for (const link of topology.links) {
        const src = (link.source || link.from || link.a || '').toString().toUpperCase();
        const dst = (link.target || link.to || link.b || '').toString().toUpperCase();
        
        for (const sw of switches) {
          const swSerial = sw.serial.toUpperCase();
          
          if ((src.includes(swSerial) && dst.includes(mxSerial)) ||
              (dst.includes(swSerial) && src.includes(mxSerial))) {
            
            const mxNodeId = dst.includes(mxSerial) ? dst : src;
            const swNodeId = dst.includes(swSerial) ? dst : src;
            const portMatch = mxNodeId.match(/port-(\d+)/i);
            const swPortMatch = swNodeId.match(/port-(\d+)/i);
            
            topologyAnalysis.push({
              switchName: sw.name,
              switchSerial: sw.serial,
              switchPort: swPortMatch ? swPortMatch[1] : 'desconocido',
              mxSerial: mxDevice.serial,
              mxPort: portMatch ? portMatch[1] : 'desconocido',
              linkSource: src,
              linkTarget: dst,
              fullLink: link
            });
            
            logger.info(`Enlace detectado: ${sw.name} Puerto ${swPortMatch ? swPortMatch[1] : '?'} → MX Puerto ${portMatch ? portMatch[1] : '?'}`);
          }
        }
      }
    }
    
    res.json({
      networkId,
      switches: switches.map(sw => ({
        name: sw.name,
        serial: sw.serial,
        model: sw.model,
        lldpPorts: Object.keys(lldpData[sw.serial]?.ports || {}),
        lldpDetails: lldpData[sw.serial]
      })),
      mxDevice: mxDevice ? {
        name: mxDevice.name,
        serial: mxDevice.serial,
        model: mxDevice.model
      } : null,
      topologyAnalysis,
      topologyRaw: topology
    });
    
  } catch (error) {
    logger.error('Error topología:', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Snapshot de datos crudos para inspección de endpoints activos
 */
exports.debugSnapshot = async (req, res) => {
  const { networkId } = req.params;
  const sampleN = 5;
  const out = { 
    endpoints: {}, 
    applianceUplinks: [], 
    portsStatuses: [], 
    lldpCdp: {}, 
    topologySample: [], 
    devicesSummary: {} 
  };
  
  try {
    // Devices summary
    try {
      const devs = await getNetworkDevices(networkId);
      const byType = {};
      for (const d of devs) {
        const k = (d.model || '').slice(0, 2).toUpperCase();
        byType[k] = (byType[k] || 0) + 1;
      }
      out.devicesSummary = byType;
    } catch {}

    // Appliance uplinks (network-level)
    try {
      const a1 = await getApplianceStatuses(networkId);
      out.endpoints.networkApplianceUplinks = true;
      const up = Array.isArray(a1) ? a1 : (a1?.uplinks || []);
      out.applianceUplinks = (Array.isArray(up) ? up : [up]).slice(0, sampleN).map(u => ({
        serial: u.serial || a1?.serial,
        model: u.model || a1?.model,
        interface: u.interface || u.name,
        status: u.status || u.reachability || u.state,
        ip: u.ip || u.wanIp || u.primaryIp,
        publicIp: u.publicIp || u.publicIP,
        loss: u.lossPercent ?? u.loss,
        latency: u.latencyMs ?? u.latency,
        jitter: u.jitterMs ?? u.jitter
      }));
    } catch (e) {
      out.endpoints.networkApplianceUplinks = false;
    }
    
    // Appliance uplinks (org-level)
    try {
      let orgId;
      try { 
        const net = await getNetworkInfo(networkId); 
        orgId = net.organizationId; 
      } catch {}
      
      if (!orgId) orgId = await resolveNetworkOrgId(networkId);
      
      if (orgId) {
        const a2 = await getOrgApplianceUplinksStatuses(orgId, { 'networkIds[]': networkId });
        out.endpoints.orgApplianceUplinks = true;
        const list = Array.isArray(a2) ? a2 : [];
        out.applianceUplinks = out.applianceUplinks.length ? out.applianceUplinks : list.slice(0, sampleN).map(d => ({
          serial: d.serial || d.deviceSerial,
          model: d.model || d.deviceModel,
          networkId: d.networkId || networkId,
          uplinks: (d.uplinks || d.uplinkStatuses || []).map(u => ({
            interface: u.interface || u.name,
            status: u.status || u.reachability || u.state,
            ip: u.ip || u.wanIp || u.primaryIp,
            publicIp: u.publicIp || u.publicIP,
            loss: u.lossPercent ?? u.loss,
            latency: u.latencyMs ?? u.latency,
            jitter: u.jitterMs ?? u.jitter
          }))
        }));
      }
    } catch (e) {
      out.endpoints.orgApplianceUplinks = false;
    }
    
    // Switch ports statuses
    try {
      const ps = await getNetworkSwitchPortsStatuses(networkId);
      out.endpoints.networkSwitchPortsStatuses = true;
      out.portsStatuses = (ps || []).slice(0, sampleN).map(p => ({
        serial: p.serial || p.switchSerial,
        portId: p.portId ?? p.port ?? p.portNumber,
        linkNegotiation: p.linkNegotiation,
        speed: p.speed ?? p.linkSpeed ?? p.speedMbps,
        duplex: p.duplex,
        linkStatus: p.linkStatus
      }));
    } catch (e) {
      out.endpoints.networkSwitchPortsStatuses = false;
    }
    
    // L2 topology sample
    try {
      const topo = await getNetworkTopologyLinkLayer(networkId);
      out.endpoints.networkTopologyLinkLayer = true;
      const links = Array.isArray(topo?.links) ? topo.links.slice(0, sampleN) : [];
      out.topologySample = links.map(l => ({
        status: l.status || l.state,
        ends: (l.ends || []).map(e => ({
          serial: e?.device?.serial,
          mac: e?.device?.mac,
          model: e?.device?.model,
          lldpPortId: e?.discovered?.lldp?.portId,
          lldpPortDesc: e?.discovered?.lldp?.portDescription,
          cdpPortId: e?.discovered?.cdp?.portId,
          cdpPortDesc: e?.discovered?.cdp?.portDescription,
        }))
      }));
    } catch (e) {
      out.endpoints.networkTopologyLinkLayer = false;
    }
    
    // LLDP/CDP de un AP (primer MR)
    try {
      const devs = await getNetworkDevices(networkId);
      const ap = (devs || []).find(d => (d.model || '').toLowerCase().startsWith('mr'));
      if (ap) {
        const cachedLldpMap = getFromCache(cache.lldpByNetwork, networkId, 'lldp') || {};
        const info = cachedLldpMap[ap.serial] || await getDeviceLldpCdp(ap.serial);
        out.lldpCdp[ap.serial] = info;
      }
    } catch {}
    
  } catch (e) {
    return res.status(500).json({ error: e.message, details: e.response?.data });
  }
  
  res.json(out);
};

/**
 * Limpiar caché (por kind y/o networkId)
 */
exports.clearCache = (req, res) => {
  try {
    const networkId = (req.body && req.body.networkId) || req.query.networkId || null;
    const kind = ((req.body && req.body.kind) || req.query.kind || 'lldp').toString();
    
    if (kind === 'lldp') {
      if (networkId) {
        cache.lldpByNetwork.delete(networkId);
        logAdmin('cache_cleared', { kind: 'lldp', networkId });
        return res.json({ ok: true, cleared: `lldp:${networkId}` });
      }
      cache.lldpByNetwork.clear();
      logAdmin('cache_cleared', { kind: 'lldp', scope: 'all' });
      return res.json({ ok: true, cleared: 'lldp:all' });
    }
    
    if (kind === 'all') {
      cache.lldpByNetwork.clear();
      cache.networkById.clear();
      cache.networksByOrg.clear();
      cache.applianceStatus.clear();
      logAdmin('cache_cleared', { kind: 'all' });
      return res.json({ ok: true, cleared: 'all' });
    }
    
    res.status(400).json({ error: 'Kind no válido. Usa: lldp, all' });
  } catch (error) {
    logger.error('Error clearing cache:', { error: error.message });
    res.status(500).json({ error: 'Error limpiando caché' });
  }
};
