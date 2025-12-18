import React, { useMemo } from 'react';
import './AppliancePorts.css';
import Tooltip from './Tooltip';

const DEFAULT_WAN_INTERFACE_MAP = {
  wan1: 1,
  internet1: 1,
  primary: 1,
  wan: 1,
  internet: 1,
  wan2: 2,
  internet2: 2,
  secondary: 2,
};

const MODEL_PORT_LAYOUTS = {
  MX84: {
    management: [
      {
        number: 'mgmt',
        displayNumber: 'MGMT',
        overrides: { role: 'management', type: 'management' },
      },
    ],
    columns: [
      {
        label: 'Internet',
        kind: 'wan',
        top: { number: 1, overrides: { role: 'wan', type: 'wan', enabled: true } },
        bottom: { number: 2, overrides: { role: 'wan', type: 'wan', enabled: true } },
      },
      { label: '', kind: 'lan', top: 3, bottom: 4 },
      { label: '', kind: 'lan', top: 5, bottom: 6 },
      { label: '', kind: 'lan', top: 7, bottom: 8 },
      { label: '', kind: 'lan', top: 9, bottom: 10 },
      {
        label: '',
        kind: 'sfp',
        top: { number: 11, overrides: { formFactor: 'sfp', type: 'sfp' } },
        bottom: { number: 12, overrides: { formFactor: 'sfp', type: 'sfp' } },
      },
    ],
    interfaceToPort: {
      wan1: 1,
      wan2: 2,
    },
  },
  Z3: {
    management: [],
    columns: [
      { label: 'Internet', kind: 'wan', top: { number: 1, overrides: { role: 'wan', type: 'wan', enabled: true } } },
      { label: '', kind: 'lan', top: { number: 2 } },
      { label: '', kind: 'lan', top: { number: 3 } },
      { label: '', kind: 'lan', top: { number: 4 } },
      { label: '', kind: 'lan', top: { number: 5 } },
    ],
    interfaceToPort: {
      wan1: 1,
    },
  },
};

const getModelLayout = (model = '') => {
  if (!model) return null;
  const normalized = model.toString().trim().toUpperCase();
  // Support Z3 variants like Z3C, Z3-*, etc.
  if (normalized.startsWith('Z3')) return MODEL_PORT_LAYOUTS.Z3;
  // Check exact model matches (MX84, MX68, etc.)
  if (MODEL_PORT_LAYOUTS[normalized]) return MODEL_PORT_LAYOUTS[normalized];
  return null;
};

const toDescriptor = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  return { number: value };
};

const createPlaceholderPort = ({ number, displayNumber, label, overrides = {} }) => {
  const numeric = parsePortNumber(number);
  const result = {
    number: numeric ?? number ?? null,
    displayNumber: displayNumber || (numeric === null && number ? number.toString().toUpperCase() : null),
    label: label || null,
    role: overrides.role || 'lan',
    type: overrides.type || overrides.role || 'lan',
    formFactor: overrides.formFactor,
    enabled: overrides.enabled ?? false,
    status: overrides.status ?? null,
    statusNormalized: overrides.statusNormalized ?? 'unknown',
    synthetic: true,
  };
  return { ...result, ...overrides };
};

const applyUplinkStatus = (port, portNumber, uplinkByPort) => {
  if (!port) return port;
  const numeric = portNumber ?? parsePortNumber(port.number);

  if (numeric !== null && uplinkByPort.has(numeric)) {
    const uplink = uplinkByPort.get(numeric);
    const normalized = normalizeReachability(uplink.statusNormalized || uplink.status);
    return {
      ...port,
      enabled: port.enabled ?? normalized !== 'disabled',
      status: uplink.status || uplink.statusNormalized || normalized,
      statusNormalized: normalized,
      uplink,
      hasCarrier: normalized === 'connected',
      speedLabel: port.speedLabel || uplink.speedLabel || uplink.speed || uplink.throughput || null,
    };
  }

  // Fallback: preserve existing status/flags, do not assume 'connected' for enabled LAN ports
  return { ...port };
};

const normalizeReachability = (value, fallback = 'unknown') => {
  if (!value) return fallback;
  const text = value.toString().trim().toLowerCase();
  if (!text) return fallback;
  if (/(not\s*connected|disconnected|offline|down|failed|inactive|unplugged|alerting)/.test(text)) return 'disconnected';
  if (/(connected|online|up|active|ready|reachable|operational)/.test(text)) return 'connected';
  if (/disabled/.test(text)) return 'disabled';
  return text;
};

const collectTokens = (port = {}) => {
  const rawTokens = [
    port.role,
    port.type,
    port.purpose,
    port.name,
    port.label,
    port.description,
    port.assignment,
    port.medium,
    port.formFactor,
    port.portMode,
    port.connectionType,
    port.productType,
    port.status,
    port.statusNormalized,
    port.tags,
    port.notes,
    port.band,
  ];
  const flattened = rawTokens.flatMap((token) => {
    if (!token) return [];
    if (Array.isArray(token)) return token;
    return token.toString().split(/[\s,]+/).filter(Boolean);
  });
  return flattened.map((token) => token.toString().toLowerCase());
};

const parsePortNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const numeric = parseInt(value.toString().replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : null;
};

const getPortAlias = (port, networkName = '', model = '', group = '', deviceCount = {}) => {
  if (!port) return '';
  
  // Para redes USAP con dispositivos MX, mostrar Wan1 y Wan2
  // USAP se detecta por: tiene MX + más de 3 APs
  const isUSAP = (networkName && networkName.toUpperCase().includes('USAP')) || 
                 (deviceCount.aps > 3 && deviceCount.hasMX);
  const isMX = model && model.toUpperCase().startsWith('MX');
  
  if (isUSAP && isMX && (group === 'wan' || port.role === 'wan') && port.number) {
    if (port.number === 1) return 'Wan1';
    if (port.number === 2) return 'Wan2';
  }
  
  if (port.uplink?.interface) return port.uplink.interface.toUpperCase();
  if (port.name && port.name.trim()) return port.name;
  if (port.label && port.label.trim()) return port.label;
  if (port.role && port.role.trim()) return port.role;
  return `Puerto ${port.number ?? ''}`.trim();
};

const buildPortClassName = (port, { rotated } = {}) => {
  const classes = ['NodePort'];
  const typeText = [port?.formFactor, port?.medium, port?.type]
    .map((item) => (item || '').toString().toLowerCase())
    .find((item) => item);

  if (typeText && /sfp|fiber/.test(typeText)) {
    classes.push('sfp');
  } else if (typeText && /usb/.test(typeText)) {
    classes.push('usb');
  } else {
    classes.push('rj45');
  }

  if (rotated) classes.push('rotated');

  if (port?.enabled === false) {
    classes.push('disabled');
  } else {
    const normalized = normalizeReachability(port?.statusNormalized || port?.status);
    // treat explicit 'warning' normalized state as warning class
    if (normalized === 'warning') {
      classes.push('warning');
      return classes.join(' ');
    }
    const hasCarrier = port?.hasCarrier === true
      || normalizeReachability(port?.uplink?.statusNormalized || port?.uplink?.status) === 'connected'
      || normalized === 'connected'
      || /up|ready|active/.test(normalized || '')
      || (typeof port?.speed === 'number' && port.speed > 0)
      || Boolean(port?.speedLabel);

    if (hasCarrier) {
      classes.push('has_carrier');
    } else if (normalized === 'disabled') {
      classes.push('disabled');
    } else if (/alert|warn|degrad|loss/.test(normalized || '')) {
      classes.push('warning');
    } else {
      classes.push('passthrough');
    }
  }

  return classes.join(' ');
};

const NodePortIcon = ({ port, rotated = false }) => {
  if (!port) return null;
  
  // Determinar estado del puerto
  const isWanPort = port.role === 'wan' || port.type === 'wan' || !!port.uplink;
  const uplink = port.uplink || {};
  const isDisconnected = !port.hasCarrier && 
    (port.statusNormalized === 'disconnected' || 
     port.status === 'Disconnected' || 
     (!port.uplink && !port.connection && !port.tooltipInfo));
  
  // Tooltip simple para puertos desconectados
  const disconnectedTooltip = isDisconnected && !isWanPort ? (
    <div>
      <div className="tooltip-title">Port {port.number || port.displayNumber}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Status</span>
        <span className="tooltip-badge error">Disconnected</span>
      </div>
    </div>
  ) : null;
  
  // Tooltip específico para puertos WAN con información de uplink
  const wanTooltipContent = isWanPort ? (
    <div>
      <div className="tooltip-title">{uplink.interface?.toUpperCase() || `WAN ${port.number || port.displayNumber}`}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Status</span>
        <span className={`tooltip-badge ${port.statusNormalized === 'connected' ? 'success' : port.statusNormalized === 'warning' ? 'warning' : port.statusNormalized === 'disconnected' ? 'error' : ''}`}>
          {port.status || uplink.status || 'Unknown'}
        </span>
      </div>
      {uplink.ip && (
        <div className="tooltip-row">
          <span className="tooltip-label">IP Address</span>
          <span className="tooltip-value">{uplink.ip}</span>
        </div>
      )}
      {uplink.publicIp && (
        <div className="tooltip-row">
          <span className="tooltip-label">Public IP</span>
          <span className="tooltip-value">{uplink.publicIp}</span>
        </div>
      )}
      {uplink.gateway && (
        <div className="tooltip-row">
          <span className="tooltip-label">Gateway</span>
          <span className="tooltip-value">{uplink.gateway}</span>
        </div>
      )}
      {uplink.provider && (
        <div className="tooltip-row">
          <span className="tooltip-label">Provider</span>
          <span className="tooltip-value">{uplink.provider}</span>
        </div>
      )}
      {(uplink.latency !== undefined && uplink.latency !== null) && (
        <div className="tooltip-row">
          <span className="tooltip-label">Latency</span>
          <span className="tooltip-value">{uplink.latency} ms</span>
        </div>
      )}
      {(uplink.loss !== undefined && uplink.loss !== null) && (
        <div className="tooltip-row">
          <span className="tooltip-label">Packet Loss</span>
          <span className={`tooltip-value ${uplink.loss > 0 ? 'text-warning' : ''}`}>{uplink.loss}%</span>
        </div>
      )}
      {(uplink.jitter !== undefined && uplink.jitter !== null) && (
        <div className="tooltip-row">
          <span className="tooltip-label">Jitter</span>
          <span className="tooltip-value">{uplink.jitter} ms</span>
        </div>
      )}
      {(port.speedLabel || uplink.speedLabel || uplink.speed || uplink.throughput) && (
        <div className="tooltip-row">
          <span className="tooltip-label">Speed</span>
          <span className="tooltip-value">{port.speedLabel || uplink.speedLabel || uplink.speed || uplink.throughput}</span>
        </div>
      )}
      {uplink.connectionType && (
        <div className="tooltip-row">
          <span className="tooltip-label">Connection</span>
          <span className="tooltip-value">{uplink.connectionType}</span>
        </div>
      )}
    </div>
  ) : null;
  
  // Tooltip para puertos LAN conectados (ej: conexión con switch)
  const lanConnectionTooltip = !isWanPort && port.connection ? (
    <div>
      <div className="tooltip-title">Port {port.number || port.displayNumber}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Connected to</span>
        <span className="tooltip-value">{port.connection.deviceName || 'Device'}</span>
      </div>
      {port.connection.deviceSerial && (
        <div className="tooltip-row">
          <span className="tooltip-label">Serial</span>
          <span className="tooltip-value">{port.connection.deviceSerial}</span>
        </div>
      )}
      {port.connection.remotePort && (
        <div className="tooltip-row">
          <span className="tooltip-label">Remote Port</span>
          <span className="tooltip-value">Port {port.connection.remotePort}</span>
        </div>
      )}
      <div className="tooltip-row">
        <span className="tooltip-label">Speed</span>
        <span className="tooltip-value">{port.connection.speed || port.speedLabel || '1 Gbps'}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Status</span>
        <span className="tooltip-badge success">Connected</span>
      </div>
    </div>
  ) : null;
  
  // Construir contenido del tooltip
  // If port has explicit tooltipInfo use it, otherwise if topology provided a connection object
  // render a simple connection tooltip so connected endpoints (APs) show info.
  // NodePortIconSfp: tooltip handling mirrors NodePortIcon, include topology connection fallback
  const tooltipContent = port?.tooltipInfo ? (
    <div>
      <div className="tooltip-title">Port {port.number || port.displayNumber}</div>
      {(port.tooltipInfo.type === 'lan-switch-connection' || port.tooltipInfo.type === 'lan-ap-connection') && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Device</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceName}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Serial</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceSerial}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Type</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceType === 'ap' ? 'Access Point' : 'Switch'}</span>
          </div>
          {port.tooltipInfo.devicePort && port.tooltipInfo.devicePort !== '-' && (
            <div className="tooltip-row">
              <span className="tooltip-label">Remote port</span>
              <span className="tooltip-value">Port {port.tooltipInfo.devicePort}</span>
            </div>
          )}
          <div className="tooltip-row">
            <span className="tooltip-label">Detection</span>
            <span className="tooltip-value">{port.tooltipInfo.detectionMethod || 'LLDP'}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Speed</span>
            <span className="tooltip-value">{port.tooltipInfo.speed || port.speedLabel || port.connection?.speed || '1 Gbps'}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Status</span>
            <span className={`tooltip-badge ${port.tooltipInfo.status === 'connected' ? 'success' : port.tooltipInfo.status === 'warning' ? 'warning' : 'error'}`}>
              {port.tooltipInfo.status}
            </span>
          </div>
        </>
      )}
      {!port.tooltipInfo.type && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Role</span>
            <span className="tooltip-value">{port.role || port.type || 'LAN'}</span>
          </div>
          {port.status && (
            <div className="tooltip-row">
              <span className="tooltip-label">Status</span>
              <span className="tooltip-value">{port.status}</span>
            </div>
          )}
          {(port.speed || port.speedLabel) && (
            <div className="tooltip-row">
              <span className="tooltip-label">Speed</span>
              <span className="tooltip-value">{port.speedLabel || port.speed}</span>
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  const topologyTooltip = !port?.tooltipInfo && port?.connection ? (
    <div>
      <div className="tooltip-title">Port {port.number || port.displayNumber}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Device</span>
        <span className="tooltip-value">{port.connection.deviceName}</span>
      </div>
      {port.connection.deviceSerial && (
        <div className="tooltip-row">
          <span className="tooltip-label">Serial</span>
          <span className="tooltip-value">{port.connection.deviceSerial}</span>
        </div>
      )}
      {port.connection.deviceType && (
        <div className="tooltip-row">
          <span className="tooltip-label">Type</span>
          <span className="tooltip-value">{port.connection.deviceType}</span>
        </div>
      )}
      <div className="tooltip-row">
        <span className="tooltip-label">Detected via</span>
        <span className="tooltip-value">Topology</span>
      </div>
    </div>
  ) : null;
  // If no tooltipInfo but topology connection exists, show basic connection tooltip
  // WAN tooltip takes priority if it's a WAN port with uplink data
  
  return (
  <Tooltip content={wanTooltipContent || lanConnectionTooltip || tooltipContent || topologyTooltip || disconnectedTooltip} position="top">
      <svg
        viewBox="0 0 30 25"
        preserveAspectRatio="none"
        className={`${buildPortClassName(port, { rotated })}`}
      >
        <g>
          <polygon points="5,9 9,9 9,6 12,6 12,3 18,3 18,6 21,6 21,9 25,9 25,21 5,21" />
        </g>
      </svg>
    </Tooltip>
  );
};

const NodePortIconSfp = ({ port, rotated = false }) => {
  if (!port) return null;
  
  // Determinar estado del puerto
  const isWanPort = port.role === 'wan' || port.type === 'wan' || !!port.uplink;
  const uplink = port.uplink || {};
  const isDisconnected = !port.hasCarrier && 
    (port.statusNormalized === 'disconnected' || 
     port.status === 'Disconnected' || 
     (!port.uplink && !port.connection && !port.tooltipInfo));
  
  // Tooltip simple para puertos desconectados
  const disconnectedTooltip = isDisconnected && !isWanPort ? (
    <div>
      <div className="tooltip-title">Port {port.number || port.displayNumber}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Status</span>
        <span className="tooltip-badge error">Disconnected</span>
      </div>
    </div>
  ) : null;
  
  // Tooltip específico para puertos WAN con información de uplink
  const wanTooltipContent = isWanPort ? (
    <div>
      <div className="tooltip-title">{uplink.interface?.toUpperCase() || `WAN ${port.number || port.displayNumber}`}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Status</span>
        <span className={`tooltip-badge ${port.statusNormalized === 'connected' ? 'success' : port.statusNormalized === 'warning' ? 'warning' : port.statusNormalized === 'disconnected' ? 'error' : ''}`}>
          {port.status || uplink.status || 'Unknown'}
        </span>
      </div>
      {uplink.ip && (
        <div className="tooltip-row">
          <span className="tooltip-label">IP Address</span>
          <span className="tooltip-value">{uplink.ip}</span>
        </div>
      )}
      {uplink.publicIp && (
        <div className="tooltip-row">
          <span className="tooltip-label">Public IP</span>
          <span className="tooltip-value">{uplink.publicIp}</span>
        </div>
      )}
      {uplink.gateway && (
        <div className="tooltip-row">
          <span className="tooltip-label">Gateway</span>
          <span className="tooltip-value">{uplink.gateway}</span>
        </div>
      )}
      {uplink.provider && (
        <div className="tooltip-row">
          <span className="tooltip-label">Provider</span>
          <span className="tooltip-value">{uplink.provider}</span>
        </div>
      )}
      {(uplink.latency !== undefined && uplink.latency !== null) && (
        <div className="tooltip-row">
          <span className="tooltip-label">Latency</span>
          <span className="tooltip-value">{uplink.latency} ms</span>
        </div>
      )}
      {(uplink.loss !== undefined && uplink.loss !== null) && (
        <div className="tooltip-row">
          <span className="tooltip-label">Packet Loss</span>
          <span className={`tooltip-value ${uplink.loss > 0 ? 'text-warning' : ''}`}>{uplink.loss}%</span>
        </div>
      )}
      {(uplink.jitter !== undefined && uplink.jitter !== null) && (
        <div className="tooltip-row">
          <span className="tooltip-label">Jitter</span>
          <span className="tooltip-value">{uplink.jitter} ms</span>
        </div>
      )}
      {(port.speedLabel || uplink.speedLabel || uplink.speed || uplink.throughput) && (
        <div className="tooltip-row">
          <span className="tooltip-label">Speed</span>
          <span className="tooltip-value">{port.speedLabel || uplink.speedLabel || uplink.speed || uplink.throughput}</span>
        </div>
      )}
      {uplink.connectionType && (
        <div className="tooltip-row">
          <span className="tooltip-label">Connection</span>
          <span className="tooltip-value">{uplink.connectionType}</span>
        </div>
      )}
    </div>
  ) : null;
  
  // Tooltip para puertos LAN conectados (ej: conexión con switch)
  const lanConnectionTooltip = !isWanPort && port.connection ? (
    <div>
      <div className="tooltip-title">Port {port.number || port.displayNumber}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Connected to</span>
        <span className="tooltip-value">{port.connection.deviceName || 'Device'}</span>
      </div>
      {port.connection.deviceSerial && (
        <div className="tooltip-row">
          <span className="tooltip-label">Serial</span>
          <span className="tooltip-value">{port.connection.deviceSerial}</span>
        </div>
      )}
      {port.connection.remotePort && (
        <div className="tooltip-row">
          <span className="tooltip-label">Remote Port</span>
          <span className="tooltip-value">Port {port.connection.remotePort}</span>
        </div>
      )}
      <div className="tooltip-row">
        <span className="tooltip-label">Speed</span>
        <span className="tooltip-value">{port.connection.speed || port.speedLabel || '1 Gbps'}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Status</span>
        <span className="tooltip-badge success">Connected</span>
      </div>
    </div>
  ) : null;
  
  // Construir contenido del tooltip (mismo que NodePortIcon)
  const tooltipContent = port?.tooltipInfo ? (
    <div>
      <div className="tooltip-title">Port {port.number || port.displayNumber}</div>
      {(port.tooltipInfo.type === 'lan-switch-connection' || port.tooltipInfo.type === 'lan-ap-connection') && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Device</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceName}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Serial</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceSerial}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Type</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceType === 'ap' ? 'Access Point' : 'Switch'}</span>
          </div>
          {port.tooltipInfo.devicePort && port.tooltipInfo.devicePort !== '-' && (
            <div className="tooltip-row">
              <span className="tooltip-label">Remote port</span>
              <span className="tooltip-value">Port {port.tooltipInfo.devicePort}</span>
            </div>
          )}
          <div className="tooltip-row">
            <span className="tooltip-label">Detection</span>
            <span className="tooltip-value">{port.tooltipInfo.detectionMethod || 'LLDP'}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Speed</span>
            <span className="tooltip-value">{port.tooltipInfo.speed || port.speedLabel || port.connection?.speed || '1 Gbps'}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Status</span>
            <span className={`tooltip-badge ${port.tooltipInfo.status === 'connected' ? 'success' : port.tooltipInfo.status === 'warning' ? 'warning' : 'error'}`}>
              {port.tooltipInfo.status}
            </span>
          </div>
        </>
      )}
      {!port.tooltipInfo.type && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Role</span>
            <span className="tooltip-value">{port.role || port.type || 'LAN'}</span>
          </div>
          {port.status && (
            <div className="tooltip-row">
              <span className="tooltip-label">Status</span>
              <span className="tooltip-value">{port.status}</span>
            </div>
          )}
          {(port.speed || port.speedLabel) && (
            <div className="tooltip-row">
              <span className="tooltip-label">Speed</span>
              <span className="tooltip-value">{port.speedLabel || port.speed}</span>
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  const topologyTooltipSfp = !port?.tooltipInfo && port?.connection ? (
    <div>
      <div className="tooltip-title">Port {port.number || port.displayNumber}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Device</span>
        <span className="tooltip-value">{port.connection.deviceName}</span>
      </div>
      {port.connection.deviceSerial && (
        <div className="tooltip-row">
          <span className="tooltip-label">Serial</span>
          <span className="tooltip-value">{port.connection.deviceSerial}</span>
        </div>
      )}
      {port.connection.deviceType && (
        <div className="tooltip-row">
          <span className="tooltip-label">Type</span>
          <span className="tooltip-value">{port.connection.deviceType}</span>
        </div>
      )}
      <div className="tooltip-row">
        <span className="tooltip-label">Detected via</span>
        <span className="tooltip-value">Topology</span>
      </div>
    </div>
  ) : null;

  return (
    <Tooltip content={wanTooltipContent || lanConnectionTooltip || tooltipContent || topologyTooltipSfp || disconnectedTooltip} position="top">
      <svg
        viewBox="0 0 30 25"
        preserveAspectRatio="none"
        className={`${buildPortClassName(port, { rotated })}`}
      >
        <polygon points="4,5 26,5 26,21 19,21 19,17 11,17 11,21 4,21" />
      </svg>
    </Tooltip>
  );
};

const NodePort = ({ port, rotated = false }) => {
  if (!port) return null;
  const typeText = [port.formFactor, port.medium, port.type]
    .map((value) => (value || '').toString().toLowerCase());
  const isSfp = typeText.some((item) => item.includes('sfp') || item.includes('fiber'));

  if (isSfp) {
    return <NodePortIconSfp port={port} rotated={rotated} />;
  }
  return <NodePortIcon port={port} rotated={rotated} />;
};

const buildColumns = (ports = [], model, uplinks = [], connectedOverrides = []) => {
  const layout = getModelLayout(model);
  const portByNumber = new Map();
  const managementCandidates = [];
  const connectedSet = new Set((Array.isArray(connectedOverrides) ? connectedOverrides : []).map((v) => Number(v)).filter(Number.isFinite));

  ports.forEach((port) => {
    const copy = { ...port };
    const number = parsePortNumber(copy.number);
    if (number !== null) portByNumber.set(number, copy);
    const tokens = collectTokens(copy);
    if (tokens.some((token) => /manage|mgmt|admin|console/.test(token))) {
      managementCandidates.push(copy);
    }
  });

  const interfaceToPort = {
    ...DEFAULT_WAN_INTERFACE_MAP,
    ...(layout?.interfaceToPort || {}),
  };

  const uplinkByPort = new Map();
  uplinks.forEach((uplink) => {
    if (!uplink) return;
    const interfaceKey = uplink.interface ? uplink.interface.toString().toLowerCase() : null;
    let mapped = null;
    if (uplink.portId !== undefined) mapped = parsePortNumber(uplink.portId);
    if (mapped == null && uplink.port !== undefined) mapped = parsePortNumber(uplink.port);
    if (mapped == null && uplink.portNumber !== undefined) mapped = parsePortNumber(uplink.portNumber);
    if (mapped == null && uplink.number !== undefined) mapped = parsePortNumber(uplink.number);
    if (mapped == null && interfaceKey && interfaceToPort[interfaceKey] !== undefined) {
      mapped = interfaceToPort[interfaceKey];
    }
    if (mapped != null) uplinkByPort.set(mapped, uplink);
  });

  const resolveDescriptor = (descriptor, kind = 'lan') => {
    const config = toDescriptor(descriptor);
    if (!config) return null;

    const baseRole = kind === 'wan' ? 'wan' : (kind === 'management' ? 'management' : 'lan');
    const overrides = {
      role: baseRole,
      type: baseRole,
      ...(config.overrides || {}),
    };

    const number = parsePortNumber(config.number);
    let resolved = null;
    if (number !== null && portByNumber.has(number)) {
      resolved = { ...portByNumber.get(number) };
    }

    if (!resolved && typeof config.number === 'string') {
      const match = ports.find((port) => port.number?.toString() === config.number.toString());
      if (match) {
        resolved = { ...match };
      }
    }

    if (!resolved) {
      resolved = createPlaceholderPort({
        number: config.number,
        displayNumber: config.displayNumber,
        label: config.label,
        overrides,
      });
    } else {
      resolved = { ...resolved, ...config.overrides };
      if (config.displayNumber) resolved.displayNumber = config.displayNumber;
      if (config.label && !resolved.label) resolved.label = config.label;
      if (!resolved.role && overrides.role) resolved.role = overrides.role;
      if (!resolved.type && overrides.type) resolved.type = overrides.type;
    }

    if (overrides.formFactor && !resolved.formFactor) resolved.formFactor = overrides.formFactor;
    if (!resolved.displayNumber && config.displayNumber) resolved.displayNumber = config.displayNumber;

    const applied = applyUplinkStatus(resolved, parsePortNumber(resolved.number ?? config.number), uplinkByPort);
    const numeric = parsePortNumber(applied.number);
    if (numeric !== null && connectedSet.has(numeric)) {
      return {
        ...applied,
        status: applied.status || 'connected',
        statusNormalized: 'connected',
        hasCarrier: true,
      };
    }
    return applied;
  };

  let management = managementCandidates.map((port) => applyUplinkStatus(port, parsePortNumber(port.number), uplinkByPort));
  management = management.map((p) => {
    const numeric = parsePortNumber(p.number);
    if (numeric !== null && connectedSet.has(numeric)) {
      return { ...p, status: p.status || 'connected', statusNormalized: 'connected', hasCarrier: true };
    }
    return p;
  });
  if (!management.length && layout?.management?.length) {
    management = layout.management
      .map((descriptor) => resolveDescriptor(descriptor, 'management'))
      .filter(Boolean);
  }

  // Remove management ports from the map so they do not appear in LAN/WAN columns twice
  managementCandidates.forEach((port) => {
    const numeric = parsePortNumber(port.number);
    if (numeric !== null) portByNumber.delete(numeric);
  });

  let columns = [];

  if (layout) {
    columns = layout.columns.map((column) => {
      const kind = column.kind || column.group || 'lan';
      return {
        group: kind === 'wan' ? 'wan' : 'lan',
        label: column.label || '',
        kind,
        top: resolveDescriptor(column.top, kind),
        bottom: resolveDescriptor(column.bottom, kind),
      };
    });
  } else {
    const classified = [];
    const managementNumbers = new Set(managementCandidates.map((port) => (port.number == null ? null : port.number.toString())));

    ports.forEach((port) => {
      if (managementNumbers.has(port.number?.toString())) return;
      const enriched = applyUplinkStatus({ ...port }, parsePortNumber(port.number), uplinkByPort);
      classified.push(enriched);
    });

    const wan = [];
    const others = [];

    classified.forEach((port) => {
      const tokens = collectTokens(port);
      const number = parsePortNumber(port.number);
      const looksWan = port.isWan === true
        || port.wanEnabled === true
        || Boolean(port.uplink)
        || tokens.some((token) => /wan|uplink|internet|pppoe|primary|secondary/.test(token))
        || (number !== null && number <= 2 && tokens.some((token) => /lan|access/.test(token) === false));

      if (looksWan) {
        wan.push(port);
      } else {
        others.push(port);
      }
    });

    uplinkByPort.forEach((_uplink, number) => {
      const alreadyPresent = wan.some((port) => parsePortNumber(port.number) === number);
      if (!alreadyPresent) {
        wan.push(applyUplinkStatus(createPlaceholderPort({
          number,
          overrides: { role: 'wan', type: 'wan', enabled: true },
        }), number, uplinkByPort));
      }
    });

    // If connectedOverrides include a port that isn't present yet, add a placeholder
    connectedSet.forEach((num) => {
      const already = wan.some((port) => parsePortNumber(port.number) === num) || classified.some((port) => parsePortNumber(port.number) === num);
      if (!already) {
        wan.push({ ...createPlaceholderPort({ number: num, overrides: { role: 'lan', type: 'lan', enabled: true } }), status: 'connected', statusNormalized: 'connected', hasCarrier: true });
      }
    });

    const wanSorted = wan.sort((a, b) => (parsePortNumber(a.number) ?? 0) - (parsePortNumber(b.number) ?? 0));
    wanSorted.forEach((port, idx) => {
      if (idx % 2 === 0) {
        const bottom = wanSorted[idx + 1] || null;
        columns.push({
          group: 'wan',
          label: columns.some((col) => col.group === 'wan') ? '' : 'Internet',
          top: port,
          bottom,
        });
      }
    });

    const sortedOthers = others.sort((a, b) => (parsePortNumber(a.number) ?? 0) - (parsePortNumber(b.number) ?? 0));
    const oddLan = sortedOthers.filter((port) => {
      const number = parsePortNumber(port.number);
      return number === null ? false : number % 2 === 1;
    });
    const evenLan = sortedOthers.filter((port) => {
      const number = parsePortNumber(port.number);
      return number === null ? false : number % 2 === 0;
    });
    const noNumber = sortedOthers.filter((port) => parsePortNumber(port.number) === null);

    if (!oddLan.length && !evenLan.length && noNumber.length) {
      const mid = Math.ceil(noNumber.length / 2);
      for (let idx = 0; idx < mid; idx += 1) {
        columns.push({
          group: 'lan',
          label: '',
          top: noNumber[idx] || null,
          bottom: noNumber[idx + mid] || null,
        });
      }
    } else {
      const rows = Math.max(oddLan.length, evenLan.length);
      for (let idx = 0; idx < rows; idx += 1) {
        columns.push({
          group: 'lan',
          label: '',
          top: oddLan[idx] || null,
          bottom: evenLan[idx] || null,
        });
      }
    }

    const leftover = noNumber.filter((port) => !columns.some((column) => column.top === port || column.bottom === port));
    leftover.forEach((port, idx) => {
      columns.push({
        group: 'lan',
        label: '',
        top: idx % 2 === 0 ? port : null,
        bottom: idx % 2 === 1 ? port : null,
      });
    });
  }

  const filteredColumns = columns.filter((column) => column.top || column.bottom);

  return {
    management,
    columns: filteredColumns,
  };
};

const AppliancePortsMatrix = ({ ports = [], model, uplinks = [], connectedOverrides = [], networkName = '', deviceCount = {} }) => {
  const { management, columns } = useMemo(
    () => buildColumns(ports, model, uplinks, connectedOverrides),
    [ports, model, uplinks, connectedOverrides]
  );
  
  // If buildColumns returned nothing but we do have a known model layout (e.g. Z3),
  // render a fallback matrix based on the layout so the UI isn't empty.
  const layout = getModelLayout(model);
  const hasContent = management.length || columns.some((column) => column.top || column.bottom);
  const shouldRenderFallback = !hasContent && layout;
  
  if (!hasContent && !shouldRenderFallback) {
    return null;
  }

  const isZ3 = model && typeof model === 'string' && model.toString().trim().toUpperCase().startsWith('Z3');

  const wanColumnCount = columns.filter((column) => column.group === 'wan').length;
  // Fallback columns based on layout when buildColumns returned none
  const fallbackColumns = shouldRenderFallback ? (layout.columns || []).map((column) => {
    const topRaw = column.top ?? null;
    const bottomRaw = column.bottom ?? null;
    const topNumber = topRaw && (topRaw.number ?? topRaw) ? (parsePortNumber(topRaw.number ?? topRaw) ?? null) : null;
    const bottomNumber = bottomRaw && (bottomRaw.number ?? bottomRaw) ? (parsePortNumber(bottomRaw.number ?? bottomRaw) ?? null) : null;
    return {
      group: column.kind === 'wan' ? 'wan' : 'lan',
      label: column.label || '',
      top: topNumber !== null ? createPlaceholderPort({ number: topNumber, displayNumber: column.top?.displayNumber || null, overrides: (column.top?.overrides || {}) }) : null,
      bottom: bottomNumber !== null ? createPlaceholderPort({ number: bottomNumber, displayNumber: column.bottom?.displayNumber || null, overrides: (column.bottom?.overrides || {}) }) : null,
    };
  }) : null;
  const effectiveColumns = shouldRenderFallback ? fallbackColumns : columns;
  
  // Validación defensiva: asegurar que effectiveColumns sea un array válido
  if (!effectiveColumns || !Array.isArray(effectiveColumns)) {
    return null;
  }
  
  const managementCellClass = management.length ? 'NodePortCell lastOfMiniGroup' : 'NodePortCell';

  const renderManagementIcons = () => {
    if (!management.length) return null;
    return (
      <div className="ManagementPorts">
        {management.map((port) => (
          <NodePort key={`mgmt-${port.number || port.name || port.id}`} port={port} rotated={false} />
        ))}
      </div>
    );
  };

  const renderManagementNumbers = () => {
    const numbers = management
      .map((port) => port.displayNumber ?? port.number)
      .filter((value) => value !== null && value !== undefined && value !== '');
    if (!numbers.length) return null;
    return (
      <div className="ManagementNumbers">
        {numbers.map((value) => (
          <span key={`mgmt-number-${value}`}>{value}</span>
        ))}
      </div>
    );
  };

  const classForColumn = (column, index) => {
    if (column.group !== 'wan') return 'NodePortCell';
    const wanIndex = columns.slice(0, index + 1).filter((item) => item.group === 'wan').length - 1;
    return wanIndex === wanColumnCount - 1 ? 'NodePortCell lastOfGroup' : 'NodePortCell';
  };

  const formatPortNumber = (port, group = '') => {
    if (!port) return '';
    if (port.displayNumber) return port.displayNumber;
    if (port.number !== undefined && port.number !== null && port.number !== '') return port.number;
    const alias = getPortAlias(port, networkName, model, group, deviceCount);
    return alias || '';
  };

  // Prefer a plain numeric port label when available (useful for WAN mappings like 'wan1' -> '1')
  const formatVisiblePortNumber = (port, group) => {
    if (!port) return '';
    
    // Para redes USAP con MX, usar el alias completo (Wan1, Wan2)
    const isUSAP = (networkName && networkName.toUpperCase().includes('USAP')) || 
                   (deviceCount.aps > 3 && deviceCount.hasMX);
    const isMX = model && model.toUpperCase().startsWith('MX');
    
    if (isUSAP && isMX && group === 'wan') {
      const alias = getPortAlias(port, networkName, model, group, deviceCount) || '';
      if (alias.startsWith('Wan')) return alias; // Devolver "Wan1" o "Wan2" completo
    }
    
    const numeric = parsePortNumber(port.number ?? port.displayNumber);
    if (numeric !== null) return numeric;
    // For WAN group where interface aliases like 'wan1' might be present, try extracting trailing digit
    if (group === 'wan') {
      const alias = getPortAlias(port, networkName, model, group, deviceCount) || '';
      const m = alias.toString().match(/(\d+)$/);
      if (m) return Number(m[1]);
    }
    return formatPortNumber(port, group);
  };

  const isPoEPort = (port, model) => {
    if (!port) return false;
    // If data explicitly marks PoE, respect it
  if (port.poeEnabled || port.poe === true || port.poeActive === true || port.poeActivePorts) return true;

    // Force PoE on port 5 for Z3-family models (Z3, Z3C, etc.) — Z3 has port 5 electrified by default
    if (model && typeof model === 'string') {
      const normalized = model.toString().trim().toUpperCase();
      if (normalized.startsWith('Z3')) {
        const num = parsePortNumber(port.number ?? port.displayNumber);
        if (num === 5) return true;
      }
    }

    return false;
  };

  const shouldRenderSwitchBadge = (port, parentModel) => {
    if (!port) return false;
    // Always render if we have an explicit lan-switch detection coming from topology/tooltip
    if (port.tooltipInfo?.type === 'lan-switch-connection') return true;

    // If topology connection explicitly marks deviceType as 'switch', render
    if (port.connection && (port.connection.deviceType || '').toString().toLowerCase().includes('switch')) return true;

    // Determine if the parent device is an appliance/UTM (MX/Z family). For appliance devices
    // be conservative: only show SW badge when the uplink/product explicitly identifies a switch.
    const parent = (parentModel || '').toString().toLowerCase();
    const isAppliance = /^mx|^z/.test(parent);

    if (port.uplink) {
      const name = (port.uplink.deviceName || port.uplink.name || port.uplink.description || '').toString().toLowerCase();
      const product = (port.uplink.productType || port.uplink.model || port.uplink.deviceType || '').toString().toLowerCase();

      // If uplink product explicitly contains 'switch' consider it a switch
      if (/(^|\s)switch/.test(product)) return true;

      // For non-appliance parents, allow looser heuristics (name contains ms/sw/switch)
      if (!isAppliance && /(\bms\b|\bsw\b|switch)/.test(name)) return true;
    }

    return false;
  };

  return (
  <div className={`PortMatrixWrapper ${isZ3 ? 'PortMatrixWrapper--z3' : ''}`}>
      {shouldRenderFallback && (
        <div style={{ marginBottom: 8, padding: '6px 10px', background: '#fff7ed', border: '1px solid #fcd34d', borderRadius: 6, color: '#92400e', fontSize: 12 }}>
          Using layout fallback for model: {model || 'unknown'}
        </div>
      )}
      <span className="NodePortTableSpan" data-testid="appliance-port-matrix">
        <table className="NodePortTable">
          <tbody>
            <tr>
              <td className={managementCellClass} />
              {effectiveColumns.map((column, index) => (
                <td key={`header-${index}`} className={classForColumn(column, index)}>
                  {isZ3 ? (column.label || '') : (column.group === 'wan' ? (column.label || 'Internet') : (column.label || ''))}
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${managementCellClass} port-number`} />
              {effectiveColumns.map((column, index) => {
                if (isZ3) {
                  const num = parsePortNumber(column.top?.number ?? column.top?.displayNumber);
                  return (
                    <td key={`top-number-${index}`} className={`${classForColumn(column, index)} port-number`}>
                      <span className="port-number-value">
                        {num}
                        {num === 5 && isPoEPort(column.top, model) && (
                          <span className="PoEInline" title="PoE" style={{ marginLeft: '4px' }}>⚡</span>
                        )}
                      </span>
                    </td>
                  );
                }
                return (
                  <td key={`top-number-${index}`} className={`${classForColumn(column, index)} port-number`}>
                    {(() => {
                      const topLabel = formatVisiblePortNumber(column.top, column.group);
                      if (topLabel) {
                        return (
                          <span className="port-number-value">
                            {topLabel}
                            {(() => {
                              const num = parsePortNumber(column.top?.number ?? column.top?.displayNumber);
                              if (num !== 5) return null;
                              if (!isPoEPort(column.top, model)) return null;
                              const normalized = normalizeReachability(column.top?.statusNormalized || column.top?.status);
                              const active = normalized === 'connected';
                              return (
                                <span className={`PoEInline ${active ? 'active' : 'inactive'}`} title={active ? 'PoE — active' : 'PoE — inactive'}>⚡</span>
                              );
                            })()}
                          </span>
                        );
                      }
                      return column.group === 'wan' ? (column.label || 'Internet') : '';
                    })()}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className={`${managementCellClass} label-cell`}>
                {!isZ3 && management.length ? 'Management' : ''}
              </td>
              {effectiveColumns.map((column, index) => (
                <td key={`top-icon-${index}`} className={classForColumn(column, index)}>
                  <div className="port-content">
                    <NodePort port={column.top} rotated={false} />
                  </div>
                </td>
              ))}
            </tr>
            {!isZ3 && (
              <tr>
                <td className={managementCellClass}>
                  {renderManagementIcons()}
                </td>
                {effectiveColumns.map((column, index) => (
                  <td key={`bottom-icon-${index}`} className={classForColumn(column, index)}>
                    <div className="port-content">
                      <NodePort port={column.bottom} rotated={Boolean(column.bottom)} />
                    </div>
                  </td>
                ))}
              </tr>
            )}
            {!isZ3 && (
              <tr>
                <td className={managementCellClass}>
                  {renderManagementNumbers()}
                </td>
                {effectiveColumns.map((column, index) => (
                  <td key={`bottom-number-${index}`} className={`${classForColumn(column, index)} port-number`}>
                    <span className="port-number-value">
                      {formatVisiblePortNumber(column.bottom, column.group)}
                      {(() => {
                        const num = parsePortNumber(column.bottom?.number ?? column.bottom?.displayNumber);
                        if (num !== 5) return null;
                        if (!isPoEPort(column.bottom, model)) return null;
                        const normalized = normalizeReachability(column.bottom?.statusNormalized || column.bottom?.status);
                        const active = normalized === 'connected';
                        return (
                          <span className={`PoEInline ${active ? 'active' : 'inactive'}`} title={active ? 'PoE — active' : 'PoE — inactive'}>⚡</span>
                        );
                      })()}
                    </span>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </span>
    </div>
  );
};

export default AppliancePortsMatrix;

// Named export for individual port renderer used by other components
export { NodePort };
