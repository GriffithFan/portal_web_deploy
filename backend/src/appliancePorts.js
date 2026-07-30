function normalizePortId(value) {
  if (value === undefined || value === null) return null;
  const text = value.toString().trim();
  return text || null;
}

function normalizeStatus(value, enabled) {
  if (!enabled) return 'disabled';
  if (value === undefined || value === null || value === '') return 'unknown';

  const text = value.toString().trim().toLowerCase();
  if (/(not\s*connected|disconnected|offline|down|failed|inactive|unplugged)/.test(text)) return 'disconnected';
  if (/(connected|online|up|active|ready|reachable|operational)/.test(text)) return 'connected';
  if (/(alerting|warning|dormant|degraded)/.test(text)) return 'warning';
  if (/disabled/.test(text)) return 'disabled';
  return 'unknown';
}

function getPortRole(port = {}) {
  const values = [
    port.role,
    port.type,
    port.usage,
    port.name,
    port.interface,
    port.portType,
    port.portRole,
  ]
    .filter(Boolean)
    .map((value) => value.toString().toLowerCase());

  if (values.some((value) => /wan|internet|uplink/.test(value))) return 'wan';
  if (values.some((value) => /management|mgmt|admin/.test(value))) return 'management';
  if (values.some((value) => /wifi|wireless/.test(value))) return 'wifi';
  return 'lan';
}

function getPortId(port = {}) {
  return normalizePortId(port.portId ?? port.number ?? port.port ?? port.portNumber ?? port.id);
}

function flattenPortStatuses(raw) {
  const statuses = [];

  const visit = (value, context = {}) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, context));
      return;
    }
    if (typeof value !== 'object') return;

    if (Array.isArray(value.ports)) {
      visit(value.ports, { ...context, name: value.name || context.name, portId: value.portId || context.portId });
      return;
    }
    if (value.ports && typeof value.ports === 'object') {
      Object.entries(value.ports).forEach(([portId, entry]) => {
        visit(entry, { ...context, portId, name: value.name || context.name });
      });
      return;
    }
    if (Array.isArray(value.items)) {
      visit(value.items, context);
      return;
    }

    const portId = getPortId(value) || normalizePortId(context.portId);
    if (!portId) return;
    statuses.push({ ...value, portId, name: value.name || context.name || null });
  };

  visit(raw);
  return statuses;
}

function parseSpeed(value) {
  if (value === undefined || value === null || value === '') {
    return { speedMbps: null, speedLabel: null };
  }
  if (typeof value === 'object') {
    return parseSpeed(value.speed ?? value.speedMbps ?? value.value);
  }
  if (typeof value === 'number') return { speedMbps: value, speedLabel: `${value} Mbps` };

  const label = value.toString().trim();
  const number = Number.parseFloat(label.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(number)) return { speedMbps: null, speedLabel: label || null };

  const lower = label.toLowerCase();
  const multiplier = lower.includes('gb') ? 1000 : lower.includes('kb') ? 0.001 : 1;
  return { speedMbps: Number((number * multiplier).toFixed(2)), speedLabel: label };
}

function normalizeInterface(value) {
  if (value === undefined || value === null) return null;
  const result = value.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return result || null;
}

function portNumber(value) {
  if (value === undefined || value === null) return null;
  const match = value.toString().match(/\d+/);
  return match ? Number(match[0]) : null;
}

function mergeAppliancePortData(configs = [], statuses = [], uplinks = []) {
  const ports = new Map();
  const upsert = (portId, update) => {
    if (!portId) return;
    const current = ports.get(portId) || { portId, number: portId };
    ports.set(portId, update(current));
  };

  const configList = Array.isArray(configs) ? configs : [];
  configList.forEach((config) => {
    const portId = getPortId(config);
    if (!portId) return;
    const enabled = config.enabled ?? true;
    const status = config.status || null;
    const speed = parseSpeed(config.speed ?? config.speedMbps ?? config.linkNegotiation);
    upsert(portId, (current) => ({
      ...current,
      portId,
      number: config.number ?? current.number ?? portId,
      name: config.name || current.name || `Puerto ${portId}`,
      role: getPortRole(config),
      type: config.type || config.portType || current.type || null,
      enabled,
      status: status || current.status || null,
      statusNormalized: normalizeStatus(status || current.status, enabled),
      speedMbps: speed.speedMbps ?? current.speedMbps ?? null,
      speedLabel: speed.speedLabel || current.speedLabel || null,
      duplex: config.duplex || current.duplex || null,
      negotiation: config.linkNegotiation || current.negotiation || null,
      vlan: config.vlan ?? current.vlan ?? null,
      allowedVlans: config.allowedVlans ?? current.allowedVlans ?? null,
      poeEnabled: config.poeEnabled ?? config.poe ?? current.poeEnabled ?? false,
      comment: config.comment || config.notes || current.comment || null,
      raw: { config, status: current.raw?.status || null },
    }));
  });

  flattenPortStatuses(statuses).forEach((statusEntry) => {
    const portId = getPortId(statusEntry);
    if (!portId) return;
    const enabled = statusEntry.enabled ?? statusEntry.isEnabled;
    const speed = parseSpeed(statusEntry.speed ?? statusEntry.speedMbps ?? statusEntry.linkSpeed ?? statusEntry.linkNegotiation);
    upsert(portId, (current) => {
      const finalEnabled = enabled ?? current.enabled ?? true;
      const rawStatus = statusEntry.status || statusEntry.linkStatus || statusEntry.connectionStatus || current.status || null;
      const role = getPortRole(statusEntry);
      return {
        ...current,
        portId,
        number: current.number ?? statusEntry.number ?? portId,
        name: statusEntry.name || current.name || `Puerto ${portId}`,
        role: role === 'lan' && current.role ? current.role : role,
        type: statusEntry.type || statusEntry.portType || current.type || null,
        enabled: finalEnabled,
        status: rawStatus,
        statusNormalized: normalizeStatus(rawStatus, finalEnabled),
        hasCarrier: normalizeStatus(rawStatus, finalEnabled) === 'connected',
        speedMbps: speed.speedMbps ?? current.speedMbps ?? null,
        speedLabel: speed.speedLabel || current.speedLabel || null,
        duplex: statusEntry.duplex || statusEntry.linkDuplex || current.duplex || null,
        negotiation: statusEntry.linkNegotiation || current.negotiation || null,
        vlan: statusEntry.vlan ?? statusEntry.accessVlan ?? current.vlan ?? null,
        allowedVlans: statusEntry.allowedVlans ?? current.allowedVlans ?? null,
        poeEnabled: statusEntry.poeEnabled ?? statusEntry.poe ?? current.poeEnabled ?? false,
        comment: statusEntry.comment || statusEntry.notes || current.comment || null,
        raw: { config: current.raw?.config || null, status: statusEntry },
      };
    });
  });

  const physicalPorts = Array.from(ports.values());
  const matchUplink = (uplink) => {
    const interfaceKey = normalizeInterface(uplink?.interface || uplink?.name || uplink?.wan);
    const explicitlyMapped = uplink?.portId ?? uplink?.port ?? uplink?.portNumber ?? uplink?.number;
    const mappedNumber = portNumber(explicitlyMapped ?? interfaceKey);

    return physicalPorts.find((port) => {
      const portId = normalizeInterface(port.portId);
      const number = portNumber(port.number ?? port.portId);
      const portName = normalizeInterface(port.name);
      return (interfaceKey && (portId === interfaceKey || portName === interfaceKey))
        || (mappedNumber !== null && number === mappedNumber && port.role === 'wan');
    });
  };

  const unmatchedUplinks = [];
  (Array.isArray(uplinks) ? uplinks : []).forEach((uplink) => {
    if (!uplink) return;
    const match = matchUplink(uplink);
    if (!match) {
      unmatchedUplinks.push(uplink);
      return;
    }
    const status = uplink.status || uplink.reachability || match.status;
    match.role = 'wan';
    match.isWan = true;
    match.uplink = uplink;
    // El estado de uplink describe la salida a Internet. El color del puerto debe
    // preferir el enlace fisico del dispositivo cuando ese dato esta disponible.
    if (status && (!match.raw?.status || match.statusNormalized === 'unknown')) {
      match.status = status;
      match.statusNormalized = normalizeStatus(status, match.enabled);
      match.hasCarrier = match.statusNormalized === 'connected';
    }
  });

  unmatchedUplinks.forEach((uplink, index) => {
    const interfaceName = uplink.interface || uplink.name || uplink.wan || `wan${index + 1}`;
    const portId = normalizePortId(interfaceName);
    if (!portId || ports.has(portId)) return;
    const status = uplink.status || uplink.reachability || null;
    const enabled = normalizeStatus(status, true) !== 'disabled';
    ports.set(portId, {
      portId,
      number: portNumber(interfaceName) ?? interfaceName,
      name: interfaceName,
      role: 'wan',
      type: 'wan',
      isWan: true,
      enabled,
      status,
      statusNormalized: normalizeStatus(status, enabled),
      hasCarrier: normalizeStatus(status, enabled) === 'connected',
      speedMbps: null,
      speedLabel: null,
      uplink,
      raw: { config: null, status: uplink },
    });
  });

  return Array.from(ports.values())
    .map((port) => ({
      ...port,
      isWan: port.role === 'wan',
      isManagement: port.role === 'management',
    }))
    .sort((a, b) => {
      const aNumber = portNumber(a.number ?? a.portId);
      const bNumber = portNumber(b.number ?? b.portId);
      if (aNumber !== null && bNumber !== null && aNumber !== bNumber) return aNumber - bNumber;
      if (aNumber !== null) return -1;
      if (bNumber !== null) return 1;
      return String(a.number ?? a.portId).localeCompare(String(b.number ?? b.portId), undefined, { numeric: true });
    });
}

function summarizeAppliancePorts(ports = []) {
  return (Array.isArray(ports) ? ports : []).reduce((summary, port) => {
    summary.total += 1;
    if (port.role === 'wan') summary.wan += 1;
    else if (port.role === 'management') summary.management += 1;
    else summary.lan += 1;

    if (port.enabled === false) summary.disabled += 1;
    else summary.enabled += 1;

    if (port.statusNormalized === 'connected') summary.connected += 1;
    else if (port.statusNormalized === 'disconnected' || port.statusNormalized === 'disabled') summary.disconnected += 1;
    else summary.unknown += 1;
    return summary;
  }, {
    total: 0,
    wan: 0,
    lan: 0,
    management: 0,
    enabled: 0,
    disabled: 0,
    connected: 0,
    disconnected: 0,
    unknown: 0,
  });
}

module.exports = {
  flattenPortStatuses,
  mergeAppliancePortData,
  summarizeAppliancePorts,
};
