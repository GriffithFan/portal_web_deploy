function toGraphFromLinkLayer(data, statusMap) {
  if (!data || !Array.isArray(data.links)) {
    return { nodes: [], links: [] };
  }

  const nodes = new Map();
  const links = new Set();

  // Register or update a device node in the graph
  const addNode = (deviceInfo) => {
    if (!deviceInfo || !deviceInfo.serial) return null;
    const id = deviceInfo.serial;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id: id,
        label: deviceInfo.name || deviceInfo.model || id,
        type: (deviceInfo.model || '').slice(0, 2).toLowerCase(),
        model: deviceInfo.model,
        mac: deviceInfo.mac,
        serial: deviceInfo.serial,
        status: (statusMap && statusMap.get(id)) || deviceInfo.status || 'unknown',
      });
    }
    return id;
  };

  // Process explicit nodes if provided
  if (Array.isArray(data.nodes)) {
    for (const n of data.nodes) {
      addNode(n);
    }
  }

  // Process links and discover implicit nodes from discovered neighbors
  for (const link of data.links) {
    if (!link || !Array.isArray(link.ends) || link.ends.length < 2) continue;

    const sourceDevice = link.ends[0]?.device;
    const targetDevice = link.ends[1]?.device;
    
    // Extract port identifiers from LLDP/CDP discovery data
    const sourcePort = link.ends[0]?.discovered?.lldp?.portId || 
                       link.ends[0]?.discovered?.cdp?.portId ||
                       link.ends[0]?.node?.portId;
    const targetPort = link.ends[1]?.discovered?.lldp?.portId || 
                       link.ends[1]?.discovered?.cdp?.portId ||
                       link.ends[1]?.node?.portId;

    const sourceId = addNode(sourceDevice);
    const targetId = addNode(targetDevice);

    if (sourceId && targetId && sourceId !== targetId) {
      // Port mapping: sourcePort is where targetId connects to sourceId
      // Example: SWITCH_01[port 24] -> SWITCH_04 means SWITCH_04.switchPort = 24
      
      // Case 1: Target connected to source port
      // Example: SWITCH_01[Port 24] -> SWITCH_04 => SWITCH_04.switchPort = 24
      if (sourcePort && nodes.has(targetId)) {
        const targetNode = nodes.get(targetId);
        const portMatch = sourcePort.toString().match(/\d+/);
        const portNum = portMatch ? parseInt(portMatch[0], 10) : null;
        
        // Only assign if target doesn't have switchPort assigned yet
        // Preserves first connection to prevent overwriting
        if (portNum !== null && !targetNode.switchPort) {
          targetNode.switchPort = portNum;
          targetNode.switchPortRaw = sourcePort;
          targetNode.connectedToPort = sourcePort;
          targetNode.parentDevice = sourceDevice?.name || sourceId;
        }
      }
      
      // Caso 2: SOURCE conectado al puerto targetPort del TARGET
      // Ejemplo: MX[Puerto X] -> SWITCH_01[Puerto 23] => SWITCH_01.switchPort = X
      // PERO: Normalmente los switches padre NO necesitan switchPort de sus hijos
      // Solo asignamos si el SOURCE es un dispositivo hoja (AP, otro switch downstream)
      if (targetPort && nodes.has(sourceId)) {
        const sourceNode = nodes.get(sourceId);
        const portMatch = targetPort.toString().match(/\d+/);
        const portNum = portMatch ? parseInt(portMatch[0], 10) : null;
        
        if (portNum !== null && !sourceNode.switchPort) {
          sourceNode.switchPort = portNum;
          sourceNode.switchPortRaw = targetPort;
          sourceNode.connectedToPort = targetPort;
          sourceNode.parentDevice = targetDevice?.name || targetId;
        }
      }

      // Ordenar IDs para crear un identificador de enlace único y evitar duplicados
      const linkId = [sourceId, targetId].sort().join('--');
      links.add(linkId);
    }
  }

  const finalLinks = Array.from(links).map(linkId => {
      const [source, target] = linkId.split('--');
      return { source, target, status: 'unknown' };
  });

  return { nodes: Array.from(nodes.values()), links: finalLinks };
}

module.exports = { toGraphFromLinkLayer };

// Intento de grafo desde discovery-by-device
function toGraphFromDiscoveryByDevice(discovery, statusMap) {
  if (!Array.isArray(discovery)) return { nodes: [], links: [] };
  const nodes = new Map();
  const links = [];
  const idOf = (x) => x?.serial || x?.deviceSerial || x?.mac || x?.neighborMac || x?.neighborSerial || x?.id || x?.name;
  for (const d of discovery) {
    const a = idOf(d) || idOf(d.device) || d.deviceMac || d.deviceId;
    if (!a) continue;
    if (!nodes.has(a)) nodes.set(a, { id: a, label: d?.name || a, type: d?.model || 'device', status: statusMap?.get(a) || 'unknown' });
    const neighs = d.neighbors || d.neighbours || d.adjacents || [];
    for (const n of neighs) {
      const b = idOf(n) || n?.chassisId || n?.systemName || n?.id;
      if (!b) continue;
      if (!nodes.has(b)) nodes.set(b, { id: b, label: n?.name || n?.systemName || b, type: n?.model || 'device', status: statusMap?.get(b) || 'unknown' });
      links.push({ source: a, target: b, status: 'unknown' });
    }
  }
  return { nodes: Array.from(nodes.values()), links };
}

module.exports.toGraphFromDiscoveryByDevice = toGraphFromDiscoveryByDevice;

function toGraphFromLldpCdp(mapBySerial, statusMap) {
  const nodes = new Map();
  const links = [];
  const addNode = (id, label, type) => {
    if (!nodes.has(id)) {
      nodes.set(id, { id, label: label || id, type: type || 'device', status: statusMap?.get(id) || 'unknown' });
    }
  };

  for (const [serial, data] of Object.entries(mapBySerial || {})) {
    addNode(serial, serial, 'device');
    const entries = [];
    if (data?.lldp) entries.push(data.lldp);
    if (data?.cdp) entries.push(data.cdp);

    for (const entry of entries) {
      const neigh = entry?.neighbors || entry?.entries || entry?.ports || entry?.interfaces || [];
      const list = Array.isArray(neigh) ? neigh : Object.values(neigh);
      for (const n of list) {
        const info = n?.neighbor || n?.remote || n || {};
        const nid = info.mac || info.chassisId || info.deviceId || info.systemName || info.name;
        if (!nid) continue;
        addNode(nid, info.systemName || info.name || nid, info.capabilities || 'device');
        links.push({ source: serial, target: nid, status: 'unknown' });
      }
    }
  }

  return { nodes: Array.from(nodes.values()), links };
}

module.exports.toGraphFromLldpCdp = toGraphFromLldpCdp;

function buildTopologyFromLldp(devices = [], lldpBySerial = {}, statusMap = new Map()) {
  const nodes = new Map();
  const links = new Map();

  const normalizeMac = (mac) => (mac || '').toLowerCase().replace(/[^0-9a-f]/g, '');
  const slugify = (value) => (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const deviceBySerial = new Map();
  const serialByMac = new Map();
  const serialByName = new Map();
  const syntheticCache = new Map();
  const usedSyntheticIds = new Set();

  devices.forEach((device) => {
    if (!device?.serial) return;
    const serial = device.serial;
    deviceBySerial.set(serial, device);
    if (device.mac) serialByMac.set(normalizeMac(device.mac), serial);
    if (device.name) serialByName.set(device.name.toLowerCase(), serial);
    nodes.set(serial, {
      id: serial,
      label: device.name || device.model || serial,
      type: (device.model || '').slice(0, 2).toLowerCase() || 'device',
      model: device.model,
      mac: device.mac,
      status: statusMap.get(serial) || device.status || 'unknown'
    });
  });

  const ensureNode = (id, meta = {}) => {
    if (!id) return null;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        label: meta.label || meta.name || meta.systemName || id,
        type: meta.type || 'external',
        model: meta.model,
        mac: meta.mac,
        status: statusMap.get(id) || 'unknown'
      });
    }
    return nodes.get(id);
  };

  const registerLink = (source, target, detail) => {
    if (!source || !target || source === target) return;
    const key = [source, target].sort().join('__');
    if (!links.has(key)) {
      links.set(key, { source, target, status: 'unknown', details: [] });
    }
    if (detail) {
      links.get(key).details.push(detail);
    }
  };

  const resolveNeighborSerial = (neighbor) => {
    if (!neighbor) return null;
    const serialCandidate = neighbor.serial || neighbor.deviceId || neighbor.chassisId;
    if (serialCandidate && deviceBySerial.has(serialCandidate)) return serialCandidate;

    const macCandidate = normalizeMac(neighbor.mac || neighbor.macAddress || neighbor.chassisId);
    if (macCandidate && serialByMac.has(macCandidate)) return serialByMac.get(macCandidate);

    const nameCandidate = (neighbor.systemName || neighbor.name || neighbor.deviceId || '').toLowerCase();
    if (nameCandidate && serialByName.has(nameCandidate)) return serialByName.get(nameCandidate);

    return null;
  };

  const createSyntheticId = (serial, localPort, neighbor) => {
    const preferredParts = [
      neighbor.systemName,
      neighbor.name,
      neighbor.deviceId,
      neighbor.chassisId,
      normalizeMac(neighbor.mac || neighbor.macAddress)
    ]
      .filter(Boolean)
      .map((part) => part.toLowerCase());

    let cacheKey = preferredParts.join('|');
    if (!cacheKey && neighbor.portId) cacheKey = `port:${neighbor.portId.toLowerCase()}`;
    if (!cacheKey && neighbor.port) cacheKey = `port:${neighbor.port.toLowerCase()}`;
    if (!cacheKey) cacheKey = [`serial:${serial}`, neighbor.protocol || 'unknown', localPort || ''].join('|').toLowerCase();

    if (syntheticCache.has(cacheKey)) {
      return syntheticCache.get(cacheKey);
    }

    const baseLabel = preferredParts[0]
      || neighbor.portId
      || neighbor.port
      || neighbor.deviceId
      || neighbor.systemName
      || neighbor.chassisId
      || normalizeMac(neighbor.mac || neighbor.macAddress)
      || 'neighbor';

    let slug = slugify(baseLabel).slice(0, 40);
    if (!slug) slug = 'neighbor';

    let candidate = `ext-${slug}`;
    let suffix = 2;
    while (usedSyntheticIds.has(candidate) || nodes.has(candidate)) {
      candidate = `ext-${slug}-${suffix}`;
      suffix += 1;
    }

    syntheticCache.set(cacheKey, candidate);
    usedSyntheticIds.add(candidate);
    return candidate;
  };

  for (const [serial, payload] of Object.entries(lldpBySerial || {})) {
    ensureNode(serial);

    const portRecords = [];
    if (payload?.ports) portRecords.push(...Object.values(payload.ports));
    if (payload?.interfaces) portRecords.push(...Object.values(payload.interfaces));
    if (Array.isArray(payload?.entries)) portRecords.push(...payload.entries);
    if (Array.isArray(payload?.neighbors)) portRecords.push(...payload.neighbors);

    portRecords.forEach((record) => {
      if (!record) return;

      const localPort = record.portId || record.port || record.interfaceId || record.name;
      const neighbors = [];
      if (record.lldp) neighbors.push({ ...record.lldp, protocol: 'lldp' });
      if (record.cdp) neighbors.push({ ...record.cdp, protocol: 'cdp' });
      if (!neighbors.length) neighbors.push({ ...record, protocol: record.protocol || 'unknown' });

      neighbors.forEach((neighbor) => {
        if (!neighbor) return;

        const resolved = resolveNeighborSerial(neighbor);
        let targetId = resolved;
        let targetIsAppliance = false;
        
        if (!resolved) {
          targetId = createSyntheticId(serial, localPort, neighbor);
          ensureNode(targetId, {
            label: neighbor.systemName || neighbor.name || neighbor.deviceId || 'Neighbor',
            model: neighbor.platform,
            mac: neighbor.mac || neighbor.macAddress,
            type: 'external'
          });
        } else {
          // Detectar si el vecino es un appliance (MX, Z, UTM)
          const targetDevice = deviceBySerial.get(resolved);
          const targetModel = targetDevice?.model || '';
          targetIsAppliance = /^(mx|z\d|utm)/i.test(targetModel);
          
          // Si es appliance y hay puerto remoto, crear nodo especial con puerto
          if (targetIsAppliance && (neighbor.portId || neighbor.port)) {
            const remotePort = neighbor.portId || neighbor.port;
            // Extraer número del puerto (ej: "Port 2" -> "2", "Gi1/0/2" -> "2")
            const portMatch = remotePort.toString().match(/\d+/);
            const portNum = portMatch ? portMatch[0] : remotePort;
            targetId = `${resolved}-port-${portNum}`;
            
            ensureNode(targetId, {
              label: `${targetDevice.name || targetModel} Port ${portNum}`,
              model: targetModel,
              type: 'appliance-port',
              applianceSerial: resolved,
              portNumber: portNum
            });
          } else {
            ensureNode(targetId);
          }
        }

        registerLink(serial, targetId, {
          protocol: neighbor.protocol || record.protocol || 'unknown',
          localPort,
          remotePort: neighbor.portId || neighbor.port,
          remoteName: neighbor.systemName || neighbor.name || neighbor.deviceId
        });
        
        // Enriquecer el nodo TARGET con el puerto LOCAL del switch donde está conectado
        // Enables device sorting by connected switch port
        if (nodes.has(targetId) && localPort) {
          const targetNode = nodes.get(targetId);
          // Extraer número del puerto local (ej: "1", "23", "Port 12" -> 12)
          const portMatch = localPort.toString().match(/\d+/);
          const portNum = portMatch ? parseInt(portMatch[0], 10) : null;
          
          if (portNum !== null && !targetNode.switchPort) {
            targetNode.switchPort = portNum;
            targetNode.switchPortRaw = localPort;
            targetNode.connectedToPort = localPort; // Puerto del switch padre
          }
        }
      });
    });
  }

  const linkList = Array.from(links.values()).map((link) => {
    if (!link.details.length) delete link.details;
    return link;
  });

  return { nodes: Array.from(nodes.values()), links: linkList };
}

module.exports.buildTopologyFromLldp = buildTopologyFromLldp;
