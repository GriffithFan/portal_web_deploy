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
};

const getModelLayout = (model = '') => {
  if (!model) return null;
  const normalized = model.toString().trim().toUpperCase();
  return MODEL_PORT_LAYOUTS[normalized] || null;
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

const getPortAlias = (port) => {
  if (!port) return '';
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
  
  // Construir contenido del tooltip
  const tooltipContent = port?.tooltipInfo ? (
    <div>
      <div className="tooltip-title">Puerto {port.number || port.displayNumber}</div>
      {port.tooltipInfo.type === 'lan-switch-connection' && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Dispositivo</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceName}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Serial</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceSerial}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Puerto remoto</span>
            <span className="tooltip-value">Puerto {port.tooltipInfo.devicePort}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Detección</span>
            <span className="tooltip-value">{port.tooltipInfo.detectionMethod || 'LLDP'}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Estado</span>
            <span className={`tooltip-badge ${port.tooltipInfo.status === 'connected' ? 'success' : 'error'}`}>
              {port.tooltipInfo.status}
            </span>
          </div>
        </>
      )}
      {!port.tooltipInfo.type && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Rol</span>
            <span className="tooltip-value">{port.role || port.type || 'LAN'}</span>
          </div>
          {port.status && (
            <div className="tooltip-row">
              <span className="tooltip-label">Estado</span>
              <span className="tooltip-value">{port.status}</span>
            </div>
          )}
          {(port.speed || port.speedLabel) && (
            <div className="tooltip-row">
              <span className="tooltip-label">Velocidad</span>
              <span className="tooltip-value">{port.speedLabel || port.speed}</span>
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  return (
    <Tooltip content={tooltipContent} position="top">
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
  
  // Construir contenido del tooltip (mismo que NodePortIcon)
  const tooltipContent = port?.tooltipInfo ? (
    <div>
      <div className="tooltip-title">Puerto {port.number || port.displayNumber}</div>
      {port.tooltipInfo.type === 'lan-switch-connection' && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Dispositivo</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceName}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Serial</span>
            <span className="tooltip-value">{port.tooltipInfo.deviceSerial}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Puerto remoto</span>
            <span className="tooltip-value">Puerto {port.tooltipInfo.devicePort}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Detección</span>
            <span className="tooltip-value">{port.tooltipInfo.detectionMethod || 'LLDP'}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Estado</span>
            <span className={`tooltip-badge ${port.tooltipInfo.status === 'connected' ? 'success' : 'error'}`}>
              {port.tooltipInfo.status}
            </span>
          </div>
        </>
      )}
      {!port.tooltipInfo.type && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Rol</span>
            <span className="tooltip-value">{port.role || port.type || 'LAN'}</span>
          </div>
          {port.status && (
            <div className="tooltip-row">
              <span className="tooltip-label">Estado</span>
              <span className="tooltip-value">{port.status}</span>
            </div>
          )}
          {(port.speed || port.speedLabel) && (
            <div className="tooltip-row">
              <span className="tooltip-label">Velocidad</span>
              <span className="tooltip-value">{port.speedLabel || port.speed}</span>
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  return (
    <Tooltip content={tooltipContent} position="top">
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

const AppliancePortsMatrix = ({ ports = [], model, uplinks = [], connectedOverrides = [] }) => {
  const { management, columns } = useMemo(
    () => buildColumns(ports, model, uplinks, connectedOverrides),
    [ports, model, uplinks, connectedOverrides]
  );
  const hasContent = management.length || columns.some((column) => column.top || column.bottom);
  if (!hasContent) return null;

  const wanColumnCount = columns.filter((column) => column.group === 'wan').length;
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

  const formatPortNumber = (port) => {
    if (!port) return '';
    if (port.displayNumber) return port.displayNumber;
    if (port.number !== undefined && port.number !== null && port.number !== '') return port.number;
    const alias = getPortAlias(port);
    return alias || '';
  };

  return (
    <div className="PortMatrixWrapper">
      <span className="NodePortTableSpan" data-testid="appliance-port-matrix">
        <table className="NodePortTable">
          <tbody>
            <tr>
              <td className={managementCellClass} />
              {columns.map((column, index) => (
                <td key={`header-${index}`} className={classForColumn(column, index)}>
                  {column.label}
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${managementCellClass} port-number`} />
              {columns.map((column, index) => (
                <td key={`top-number-${index}`} className={`${classForColumn(column, index)} port-number`}>
                  {formatPortNumber(column.top)}
                </td>
              ))}
            </tr>
            <tr>
              <td className={`${managementCellClass} label-cell`}>
                {management.length ? 'Management' : ''}
              </td>
              {columns.map((column, index) => (
                <td key={`top-icon-${index}`} className={classForColumn(column, index)}>
                  <NodePort port={column.top} rotated={false} />
                </td>
              ))}
            </tr>
            <tr>
              <td className={managementCellClass}>
                {renderManagementIcons()}
              </td>
              {columns.map((column, index) => (
                <td key={`bottom-icon-${index}`} className={classForColumn(column, index)}>
                  <NodePort port={column.bottom} rotated={Boolean(column.bottom)} />
                </td>
              ))}
            </tr>
            <tr>
              <td className={managementCellClass}>
                {renderManagementNumbers()}
              </td>
              {columns.map((column, index) => (
                <td key={`bottom-number-${index}`} className={`${classForColumn(column, index)} port-number`}>
                  {formatPortNumber(column.bottom)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </span>
    </div>
  );
};

export default AppliancePortsMatrix;
