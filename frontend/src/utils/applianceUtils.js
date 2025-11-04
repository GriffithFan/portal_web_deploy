/**
 * Agrupa puertos del appliance por rol (WAN/LAN)
 */
export const groupPortsByRole = (ports = []) => {
  const groups = new Map();
  ports.forEach((port) => {
    const role = (port.role || port.type || 'LAN').toLowerCase();
    if (!groups.has(role)) groups.set(role, []);
    groups.get(role).push(port);
  });
  return groups;
};

/**
 * Deriva puertos conectados desde la topología
 */
export const deriveConnectedPortsFromTopology = (applianceSerial, topology) => {
  if (!applianceSerial || !topology) return [];
  
  const nodes = Array.isArray(topology.nodes) ? topology.nodes : [];
  const links = Array.isArray(topology.links) ? topology.links : [];
  
  const applianceNode = nodes.find(n => n.serial === applianceSerial);
  if (!applianceNode) return [];
  
  const connectedPorts = new Set();
  
  links.forEach(link => {
    if (link.source === applianceNode.id && link.sourcePort) {
      const portNum = parseInt(link.sourcePort, 10);
      if (Number.isFinite(portNum)) connectedPorts.add(portNum);
    }
    if (link.target === applianceNode.id && link.targetPort) {
      const portNum = parseInt(link.targetPort, 10);
      if (Number.isFinite(portNum)) connectedPorts.add(portNum);
    }
  });
  
  return Array.from(connectedPorts).sort((a, b) => a - b);
};

/**
 * Enriquece puertos con información de conexiones desde topología
 */
export const enrichPortsWithConnections = (ports, applianceSerial, topology) => {
  if (!ports || !Array.isArray(ports)) return [];
  if (!applianceSerial || !topology) return ports;
  
  const nodes = Array.isArray(topology.nodes) ? topology.nodes : [];
  const links = Array.isArray(topology.links) ? topology.links : [];
  
  const applianceNode = nodes.find(n => n.serial === applianceSerial);
  if (!applianceNode) return ports;
  
  // Crear un mapa de puerto -> dispositivo conectado
  const portConnections = new Map();
  
  links.forEach(link => {
    if (link.source === applianceNode.id && link.sourcePort) {
      const portNum = parseInt(link.sourcePort, 10);
      if (Number.isFinite(portNum)) {
        const targetNode = nodes.find(n => n.id === link.target);
        if (targetNode) {
          portConnections.set(portNum, {
            deviceName: targetNode.label || targetNode.name || targetNode.serial,
            deviceSerial: targetNode.serial,
            deviceType: targetNode.type || 'unknown'
          });
        }
      }
    }
    
    if (link.target === applianceNode.id && link.targetPort) {
      const portNum = parseInt(link.targetPort, 10);
      if (Number.isFinite(portNum)) {
        const sourceNode = nodes.find(n => n.id === link.source);
        if (sourceNode) {
          portConnections.set(portNum, {
            deviceName: sourceNode.label || sourceNode.name || sourceNode.serial,
            deviceSerial: sourceNode.serial,
            deviceType: sourceNode.type || 'unknown'
          });
        }
      }
    }
  });
  
  // Enriquecer cada puerto con su conexión
  return ports.map(port => {
    const portNum = parseInt(port.number, 10);
    const connection = portConnections.get(portNum);
    
    return {
      ...port,
      connection: connection || null,
      hasTopologyConnection: !!connection
    };
  });
};
