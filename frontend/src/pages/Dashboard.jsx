import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react';
/* eslint-disable no-unused-vars */
// Algunas utilidades permanecen definidas para mantenimiento/depuración y pueden no usarse siempre.
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import AppliancePortsMatrix from '../components/AppliancePortsMatrix';
import Tooltip from '../components/Tooltip';
import { SkeletonTable, SkeletonDeviceList, SkeletonTopology } from '../components/ui/SkeletonLoaders';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Lazy load componentes pesados para reducir bundle inicial
const SimpleGraph = lazy(() => import('../components/SimpleGraph'));
const ConnectivityGraph = lazy(() => import('../components/ConnectivityGraph'));
const ApplianceHistoricalCharts = lazy(() => import('../components/ApplianceHistoricalCharts'));

// Iconos para el Sidebar
const TopologyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <circle cx="12" cy="3" r="1"></circle>
    <circle cx="12" cy="21" r="1"></circle>
    <circle cx="3" cy="12" r="1"></circle>
    <circle cx="21" cy="12" r="1"></circle>
    <line x1="12" y1="9" x2="12" y2="5"></line>
    <line x1="12" y1="19" x2="12" y2="15"></line>
    <line x1="9" y1="12" x2="5" y2="12"></line>
    <line x1="19" y1="12" x2="15" y2="12"></line>
  </svg>
);

const SwitchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"></rect>
    <line x1="6" y1="11" x2="6.01" y2="11"></line>
    <line x1="10" y1="11" x2="10.01" y2="11"></line>
    <line x1="14" y1="11" x2="14.01" y2="11"></line>
    <line x1="18" y1="11" x2="18.01" y2="11"></line>
    <line x1="6" y1="14" x2="6.01" y2="14"></line>
    <line x1="10" y1="14" x2="10.01" y2="14"></line>
    <line x1="14" y1="14" x2="14.01" y2="14"></line>
    <line x1="18" y1="14" x2="18.01" y2="14"></line>
  </svg>
);

const WifiIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
    <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
    <line x1="12" y1="20" x2="12.01" y2="20"></line>
  </svg>
);

const ServerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
    <line x1="6" y1="6" x2="6.01" y2="6"></line>
    <line x1="6" y1="18" x2="6.01" y2="18"></line>
  </svg>
);

const DEFAULT_SECTIONS = [
  { k: 'topology', t: 'Topología', IconComponent: TopologyIcon },
  { k: 'switches', t: 'Switches', IconComponent: SwitchIcon },
  { k: 'access_points', t: 'Puntos de acceso', IconComponent: WifiIcon },
  { k: 'appliance_status', t: 'Estado (appliances)', IconComponent: ServerIcon }
];

const DEFAULT_UPLINK_TIMESPAN = 24 * 3600; // 24h
const DEFAULT_UPLINK_RESOLUTION = 300; // 5 min buckets

const normalizeReachability = (value, fallback = 'unknown') => {
  if (!value) return fallback;
  const normalized = value.toString().trim().toLowerCase();
  if (/(not\s*connected|disconnected|offline|down|failed|inactive|unplugged|alerting)/.test(normalized)) return 'disconnected';
  if (/(connected|online|up|active|ready|reachable|operational)/.test(normalized)) return 'connected';
  if (/disabled/.test(normalized)) return 'disabled';
  return normalized || fallback;
};

const getStatusColor = (value) => {
  const normalized = normalizeReachability(value);
  if (normalized === 'connected') return '#059669';
  if (normalized === 'disconnected') return '#ef4444';
  if (normalized === 'disabled') return '#94a3b8';
  return '#6366f1';
};

const resolvePortColor = (port) => {
  if (!port.enabled && port.enabled !== undefined) return '#94a3b8';
  const normalized = normalizeReachability(port.statusNormalized || port.status);
  if (normalized === 'connected') return '#047857';
  if (normalized === 'disconnected' || normalized === 'disabled') return '#f59e0b';
  return '#60a5fa';
};

const looksLikeSerial = (value) => {
  if (!value) return false;
  const text = value.toString().trim();
  if (!text) return false;
  const pattern = /^[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){2,}$/i;
  if (pattern.test(text)) return true;
  const compact = text.replace(/[^a-z0-9]/gi, '');
  return compact.length >= 10 && /[a-z]/i.test(compact) && /\d/.test(compact);
};

const formatSpeedLabel = (port) => {
  if (!port) return '-';
  if (port.speedLabel) return port.speedLabel;
  if (port.speed) return port.speed;
  if (port.speedMbps != null) return `${port.speedMbps} Mbps`;
  return '-';
};

const formatWiredSpeed = (speedString, isEnriched = false) => {
  // Si no hay datos enriquecidos aún, mostrar placeholder
  if (!isEnriched) return '-';
  
  if (!speedString) return '-';
  
  // Si ya viene en formato Meraki correcto, retornar tal cual
  if (speedString.toLowerCase().includes('mbit') || speedString.toLowerCase().includes('mbps')) {
    return speedString;
  }
  
  // Convertir formatos comunes a "X Mbit, full/half duplex"
  const lowerSpeed = speedString.toLowerCase();
  let mbits = 0;
  let duplex = '';
  
  // Detectar duplex
  if (lowerSpeed.includes('full')) {
    duplex = ', full duplex';
  } else if (lowerSpeed.includes('half')) {
    duplex = ', half duplex';
  } else {
    // Si no se especifica, asumir full duplex solo para velocidades altas
    duplex = ', full duplex';
  }
  
  // Extraer velocidad
  if (lowerSpeed.includes('gbps') || lowerSpeed.includes('gb/s') || lowerSpeed.includes('gbit')) {
    const match = speedString.match(/(\d+(?:\.\d+)?)/);
    if (match) mbits = parseFloat(match[1]) * 1000;
  } else if (lowerSpeed.includes('mbps') || lowerSpeed.includes('mb/s') || lowerSpeed.includes('mbit')) {
    const match = speedString.match(/(\d+(?:\.\d+)?)/);
    if (match) mbits = parseFloat(match[1]);
  } else {
    // Si es solo un número, asumir Mbps
    const match = speedString.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      mbits = parseFloat(match[1]);
      // Si es >= 1000, probablemente está en Mbps y necesita conversión
      if (mbits >= 1000) {
        // No convertir, mantener como está
      }
    }
  }
  
  if (mbits > 0) {
    return `${Math.round(mbits)} Mbit${duplex}`;
  }
  
  // Si no se pudo parsear, retornar original
  return speedString;
};

const formatKbpsValue = (value) => {
  if (value == null) return '-';
  if (Math.abs(value) >= 1024) return `${(value / 1024).toFixed(1)} Mbps`;
  if (Math.abs(value) >= 1) return `${value.toFixed(0)} Kbps`;
  return `${(value * 1000).toFixed(0)} bps`;
};

const summarizeUsage = (port) => {
  if (!port) return '-';
  if (port.usageKbps != null) return formatKbpsValue(port.usageKbps);
  const down = port.usageSplitKbps?.down;
  const up = port.usageSplitKbps?.up;
  if (down != null || up != null) {
    const downLabel = down != null ? formatKbpsValue(down) : '-';
    const upLabel = up != null ? formatKbpsValue(up) : '-';
    return `${downLabel} ↓ / ${upLabel} ↑`;
  }
  return '-';
};

const getPortAlias = (port) => {
  if (!port) return '';
  if (port.uplink?.interface) return port.uplink.interface.toUpperCase();
  if (port.name && !looksLikeSerial(port.name)) return port.name;
  if (port.role === 'wan') return `WAN ${port.number}`;
  return `Puerto ${port.number}`;
};

const getPortStatusLabel = (port) => {
  if (!port) return '-';
  if (port.enabled === false) return 'disabled';
  return normalizeReachability(port.statusNormalized || port.status);
};

// Legacy components - conservados por si se necesitan más tarde
/*
const AppliancePortsSummary = ({ ports = [], summary }) => {
  if (!ports.length && !summary) return null;

  const totalPorts = summary?.total ?? ports.length;
  const wanPorts = summary?.wan ?? ports.filter((p) => (p.isWan === true) || (p.role === 'wan') || (p.type === 'wan')).length;
  const managementPorts = summary?.management ?? ports.filter((p) => (p.role || '').toLowerCase() === 'management').length;
  const lanPorts = summary?.lan ?? Math.max(0, totalPorts - wanPorts - managementPorts);
  const enabledPorts = summary?.enabled ?? ports.filter((p) => p.enabled !== false).length;
  const connectedPorts = summary?.connected ?? ports.filter((p) => normalizeReachability(p.statusNormalized || p.status) === 'connected').length;
  const poeActive = summary?.poeActive ?? ports.filter((p) => p.poeEnabled && normalizeReachability(p.statusNormalized || p.status) === 'connected').length;
  const poeTotal = summary?.poePorts ?? ports.filter((p) => p.poeEnabled).length;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
      <div><strong>{totalPorts}</strong> Puertos totales</div>
      <div><strong>{lanPorts}</strong> LAN</div>
      <div><strong>{wanPorts}</strong> WAN</div>
      {managementPorts > 0 && <div><strong>{managementPorts}</strong> Gestión</div>}
      <div><strong style={{ color: '#047857' }}>{enabledPorts}</strong> Habilitados</div>
      <div><strong style={{ color: '#059669' }}>{connectedPorts}</strong> Conectados</div>
      {poeTotal > 0 && (
        <div><strong>{poeActive}/{poeTotal}</strong> PoE activos</div>
      )}
    </div>
  );
};

const groupPortsByRole = (ports = []) => {
  const groups = new Map();
  ports.forEach((port) => {
    const role = (port.role || port.type || 'LAN').toLowerCase();
    if (!groups.has(role)) groups.set(role, []);
    groups.get(role).push(port);
  });
  return groups;
};

const AppliancePortGrid = ({ ports = [] }) => {
  if (!ports.length) return null;

  const groups = groupPortsByRole(ports);
  const preferredOrder = ['wan', 'management', 'lan', 'wifi', 'cellular', 'other'];
  const orderedGroups = Array.from(groups.entries()).sort((a, b) => {
    const ia = preferredOrder.indexOf(a[0]);
    const ib = preferredOrder.indexOf(b[0]);
    if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 18 }}>
      {orderedGroups
        .filter(([role]) => role !== 'lan') // Ocultar sección LAN
        .map(([role, rolePorts]) => (
        <div key={role} style={{ flex: '1 1 260px', minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5, color: '#0f172a' }}>{role.toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rolePorts.map((port) => {
              const alias = getPortAlias(port);
              const statusLabel = getPortStatusLabel(port);
              const statusColor = resolvePortColor(port);
              const usageLabel = summarizeUsage(port);
              const poeLabel = port.poeEnabled ? 'Sí' : 'No';
              const vlanLabel = port.vlan || '-';
              const uplink = port.uplink;
              
              // Determinar si el puerto está en uso
              const isInUse = statusLabel.toLowerCase().includes('connected') || 
                             statusLabel.toLowerCase().includes('active') ||
                             statusLabel.toLowerCase().includes('ready');
              const bgColor = isInUse ? '#fff' : '#94a3b8'; // Gris slate-400 para puertos no conectados

              return (
                <div
                  key={`${role}-${port.number}-${alias}`}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 12,
                    background: bgColor,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{alias}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, textTransform: 'uppercase' }}>{statusLabel}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6, fontSize: 12, color: '#475569' }}>
                    <div>Puerto: <strong>{port.number}</strong></div>
                    <div>VLAN: <strong>{vlanLabel}</strong></div>
                    <div>Velocidad: <strong>{formatSpeedLabel(port)}</strong></div>
                    <div>Uso: <strong>{usageLabel}</strong></div>
                    <div>PoE: <strong>{poeLabel}</strong></div>
                    {port.duplex && <div>Duplex: <strong>{port.duplex}</strong></div>}
                    {port.negotiation && <div>Negociación: <strong>{port.negotiation}</strong></div>}
                  </div>

                  {uplink && (
                    <div style={{ fontSize: 12, color: '#1e293b', background: '#f1f5f9', borderRadius: 10, padding: '8px 10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                      <div>IP: <strong>{uplink.ip || '-'}</strong></div>
                      <div>IP pública: <strong>{uplink.publicIp || '-'}</strong></div>
                      <div>Gateway: <strong>{uplink.gateway || '-'}</strong></div>
                      <div>ISP: <strong>{uplink.provider || '-'}</strong></div>
                      {uplink.loss != null && <div>Loss: <strong>{uplink.loss}%</strong></div>}
                      {uplink.latency != null && <div>Latencia: <strong>{uplink.latency} ms</strong></div>}
                      {uplink.jitter != null && <div>Jitter: <strong>{uplink.jitter} ms</strong></div>}
                    </div>
                  )}

                  {port.comment && (
                    <div style={{ fontSize: 11, color: '#475569', background: '#f1f5f9', borderRadius: 8, padding: '6px 8px' }}>
                      {port.comment}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
*/

// Legacy utility functions - conservadas por compatibilidad
/*
const formatMetric = (value) => {
  if (value == null) return '-';
  if (value <= 0) return '0 Kbps';
  if (value >= 1024) return `${(value / 1024).toFixed(1)} Mbps`;
  if (value >= 1) return `${value.toFixed(1)} Kbps`;
  return `${(value * 1000).toFixed(1)} bps`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatList = (value) => {
  if (!value) return '-';
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-';
  }
  return value.toString();
};
*/

const formatDuration = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '0s';
  const parts = [];
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length || secs) parts.push(`${secs}s`);
  return parts.slice(0, 2).join(' ');
};

// Intenta derivar números de puerto conectados a partir de topology.links
const deriveConnectedPortsFromTopology = (applianceSerial, topology) => {
  try {
    if (!applianceSerial || !topology || !Array.isArray(topology.links)) return [];
    const serial = applianceSerial.toString();
    const ports = new Set();
    topology.links.forEach((link) => {
      const src = link.source ?? link.from ?? link.a ?? null;
      const dst = link.target ?? link.to ?? link.b ?? null;
      const other = src === serial ? dst : (dst === serial ? src : null);
      if (!other) return;
      const text = other?.toString() || '';
      // Buscar patrones tipo 'port-10' o 'port_10' o '-port-10' o 'port10' al final
      const m = text.match(/port[-_]?([0-9]{1,3})$/i) || text.match(/-p([0-9]{1,3})$/i) || text.match(/[:#]([0-9]{1,3})$/);
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n)) ports.add(n);
      }
    });
    return Array.from(ports).sort((a, b) => a - b);
  } catch (e) {
    return [];
  }
};

// Nueva función: enriquecer puertos con dispositivos conectados
const enrichPortsWithConnections = (ports, applianceSerial, topology) => {
  try {
    if (!applianceSerial || !topology || !Array.isArray(topology.links) || !Array.isArray(topology.nodes)) return ports;
    
    const serial = applianceSerial.toString();
    const nodeMap = new Map(topology.nodes.map(n => [n.id, n]));
    const portConnections = new Map();
    
    topology.links.forEach((link) => {
      const src = link.source ?? link.from ?? link.a ?? null;
      const dst = link.target ?? link.to ?? link.b ?? null;
      
      // Verificar si alguno de los nodos involucra este appliance
      const srcIsTarget = src?.toString().startsWith(`${serial}-port-`);
      const dstIsTarget = dst?.toString().startsWith(`${serial}-port-`);
      
      if (srcIsTarget || dstIsTarget) {
        const portNodeId = srcIsTarget ? src : dst;
        const deviceNodeId = srcIsTarget ? dst : src;
        
        // Extraer número de puerto
        const portMatch = portNodeId.toString().match(/port-(\d+)$/);
        if (portMatch) {
          const portNum = Number(portMatch[1]);
          const deviceNode = nodeMap.get(deviceNodeId);
          if (deviceNode) {
            portConnections.set(portNum, deviceNode.label || deviceNode.id);
          }
        }
      }
    });
    
    // Enriquecer puertos con información de conexión
    return ports.map(port => {
      const portNum = Number(port.number);
      if (Number.isFinite(portNum) && portConnections.has(portNum)) {
        return {
          ...port,
          connectedDevice: portConnections.get(portNum),
          // Marcar como conectado para que se ilumine en verde
          statusNormalized: 'connected',
          status: 'active',
          hasCarrier: true
        };
      }
      return port;
    });
    
  } catch (e) {
    console.error('Error enriching ports:', e);
    return ports;
  }
};

const formatQualityScore = (value) => {
  if (value === null || value === undefined) return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '-';
  return `${Math.round(numeric)} pts`;
};

const formatCoverage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return '-';
  if (numeric > 1 && numeric <= 100) return `${Math.round(numeric)}%`;
  if (numeric <= 1) return `${Math.round(numeric * 100)}%`;
  return `${Math.round(Math.min(numeric, 100))}%`;
};

const ConnectivityTimeline = ({ series }) => {
  const points = Array.isArray(series?.points) ? series.points : [];
  if (points.length < 2) return null;

  const parsed = points
    .map((point) => {
      const ts = new Date(point.ts || point.timestamp || point.time).getTime();
      if (Number.isNaN(ts)) return null;
      return {
        time: ts,
        status: normalizeReachability(point.statusNormalized || point.status || point.reachability),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);

  if (parsed.length < 2) return null;

  const totalDuration = parsed[parsed.length - 1].time - parsed[0].time;
  if (totalDuration <= 0) return null;

  const segments = [];
  for (let i = 0; i < parsed.length - 1; i += 1) {
    const current = parsed[i];
    const next = parsed[i + 1];
    const duration = next.time - current.time;
    if (duration <= 0) continue;
    segments.push({
      status: current.status,
      duration,
    });
  }

  if (!segments.length) return null;

  const statusColor = (status) => {
    if (status === 'connected') return '#059669';
    if (status === 'disabled') return '#94a3b8';
    return '#f97316';
  };

  return (
    <div style={{ display: 'flex', borderRadius: 999, overflow: 'hidden', border: '1px solid #cbd5e1', height: 12, width: '100%' }}>
      {segments.map((segment, idx) => (
        <div
          key={`${segment.status}-${idx}`}
          style={{
            flex: segment.duration,
            background: statusColor(segment.status),
          }}
        />
      ))}
    </div>
  );
};

// Legacy component - conservado por compatibilidad
/*
const UsageSparkline = ({ series }) => {
  const points = Array.isArray(series?.points) ? series.points : [];
  const usagePoints = points
    .map((point) => ({
      value: point.totalKbps ?? point.usage ?? point.throughput ?? null,
    }))
    .filter((item) => typeof item.value === 'number' && !Number.isNaN(item.value));

  if (usagePoints.length < 2) return null;

  const maxValue = Math.max(...usagePoints.map((item) => item.value));
  if (!Number.isFinite(maxValue) || maxValue <= 0) return null;

  const width = 260;
  const height = 60;

  const path = usagePoints
    .map((item, index) => {
      const x = (index / (usagePoints.length - 1)) * width;
      const y = height - (item.value / maxValue) * height;
      const prefix = index === 0 ? 'M' : 'L';
      return `${prefix}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={path} fill="none" stroke="#4f46e5" strokeWidth="2" />
    </svg>
  );
};
*/

const SignalQualitySparkline = ({ samples = [], threshold = 25 }) => {
  const points = Array.isArray(samples) ? samples.filter((sample) => sample && sample.signalQuality !== null && sample.signalQuality !== undefined) : [];
  if (points.length < 2) return null;

  const width = 260;
  const height = 70;
  const qualities = points.map((sample) => Number(sample.signalQuality));
  const maxValue = Math.max(...qualities, threshold + 5, 1);
  const minValue = Math.min(...qualities, threshold - 10);
  const range = Math.max(maxValue - minValue, 10);

  const toPathPoint = (sample, index) => {
    const x = (index / (points.length - 1 || 1)) * width;
    const normalized = (Number(sample.signalQuality) - minValue) / range;
    const y = height - normalized * height;
    const prefix = index === 0 ? 'M' : 'L';
    return `${prefix}${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const linePath = points.map(toPathPoint).join(' ');
  const thresholdRatio = (threshold - minValue) / range;
  const thresholdY = height - thresholdRatio * height;
  const lastPoint = points[points.length - 1];
  const lastX = width;
  const lastNormalized = (Number(lastPoint.signalQuality) - minValue) / range;
  const lastY = height - lastNormalized * height;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path d={`${linePath} L ${lastX} ${height} L 0 ${height} Z`} fill="url(#signalGradient)" opacity="0.35" />
      <path d={linePath} fill="none" stroke="#059669" strokeWidth="2" />
      <line x1="0" x2={width} y1={thresholdY} y2={thresholdY} stroke="#f97316" strokeDasharray="6 4" strokeWidth="1" />
      <circle cx={lastX} cy={lastY} r={3} fill="#0f172a" stroke="#fff" strokeWidth="1" />
    </svg>
  );
};

// Nuevo componente de barra de conectividad tipo Meraki Dashboard
const ConnectivityBar = ({ ap, device }) => {
  const targetDevice = device || ap;
  const wireless = targetDevice.wireless || {};
  const history = Array.isArray(wireless.history) ? wireless.history : [];
  const isOnline = normalizeReachability(targetDevice.status) === 'connected';
  
  // Nota: comprobación puntual suprimida
  // Depuración puntual eliminada para evitar mensajes innecesarios en consola.
  
  // Si no hay historial, mostrar barra basada en status actual
  if (!history.length) {
    return (
      <div style={{ display: 'flex', height: '8px', borderRadius: '2px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
        <div
          style={{
            width: '100%',
            background: isOnline ? '#45991f' : '#cbd5e1',
            transition: 'all 0.3s ease',
          }}
          title={isOnline ? 'Conectado' : 'Sin datos'}
        />
      </div>
    );
  }

  // Crear segmentos individuales para cada muestra - sin agrupar para ver interferencias
  const signalThreshold = 20;

  const segments = history.map((sample) => {
    const quality = sample.signalQuality ?? -1;
    const hasFailures = sample.failures > 0; // Si tiene failures registrados, es un microcorte
    
    // Si tiene failures o quality es exactamente 0 (microcorte marcado)
    if (hasFailures || quality === 0) {
      return { color: '#ef4444', label: `Microcorte${hasFailures ? ` (${sample.failures} fallos)` : ''}` };
    } else if (quality < 0) {
      // Sin datos (-1 o null)
      return { color: '#cbd5e1', label: 'Sin señal' };
    } else if (quality <= signalThreshold) {
      // Señal débil pero no microcorte completo
      return { color: '#f59e0b', label: 'Señal débil' };
    } else {
      // Señal buena
      return { color: '#45991f', label: 'Conectado' };
    }
  });

  const totalSamples = segments.length;
  const segmentWidth = totalSamples > 0 ? (100 / totalSamples) : 100;

  return (
    <div style={{ display: 'flex', height: '8px', borderRadius: '2px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
      {segments.map((segment, idx) => {
        return (
          <div
            key={idx}
            style={{
              flex: `0 0 ${segmentWidth}%`,
              background: segment.color,
              transition: 'all 0.2s ease',
              position: 'relative',
              minWidth: '1px',
            }}
            title={segment.label}
          />
        );
      })}
    </div>
  );
};

const AccessPointCard = ({ ap, signalThreshold = 25, isEnriched = false }) => {
  const statusColor = getStatusColor(ap.status);
  const wireless = ap.wireless || {};
  const summary = wireless.signalSummary || wireless.deviceAggregate || {};
  const history = Array.isArray(wireless.history) ? wireless.history : [];
  const clients = Array.isArray(wireless.clients) ? wireless.clients : [];
  const microDrops = summary.microDrops ?? wireless.microDrops ?? 0;
  const microDuration = summary.microDurationSeconds ?? wireless.microDurationSeconds ?? 0;
  const worst = summary.worst ?? summary.device?.min ?? null;
  const average = summary.average ?? summary.deviceAverage ?? null;
  const latest = summary.latest ?? null;

  const connectivitySeries = history.length
    ? {
        points: history.map((sample) => ({
          ts: sample.ts || sample.timestamp,
          status: (sample.signalQuality ?? 0) <= signalThreshold ? 'disconnected' : 'connected',
        })),
      }
    : null;

  const isOnline = normalizeReachability(ap.status) === 'connected';

  return (
    <div className="modern-card">
      <div className="modern-card-header">
        <div>
          <h3 className="modern-card-title">{ap.name || ap.serial}</h3>
          <p className="modern-card-subtitle">
            {ap.model} · {ap.serial}
          </p>
          <p className="modern-card-subtitle" style={{ marginTop: '2px', fontSize: '11px' }}>
            LLDP: {ap.connectedTo || '-'} · {formatWiredSpeed(ap.wiredSpeed, isEnriched)}
          </p>
        </div>
        <span 
          className={`status-badge ${isOnline ? 'online' : 'offline'}`}
          style={{ 
            background: isOnline ? '#d1fae5' : '#fee2e2',
            color: statusColor 
          }}
        >
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: statusColor 
          }} />
          {ap.status || 'unknown'}
        </span>
      </div>

      {/* Calidad de señal metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', 
        gap: '10px', 
        marginBottom: '16px'
      }}>
        <div style={{ 
          padding: '10px 12px', 
          borderRadius: '8px', 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0' 
        }}>
          <div style={{ fontSize: '10px', color: '#047857', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Promedio
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#047857', marginTop: '2px' }}>
            {formatQualityScore(average)}
          </div>
        </div>
        <div style={{ 
          padding: '10px 12px', 
          borderRadius: '8px', 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe' 
        }}>
          <div style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Actual
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#1d4ed8', marginTop: '2px' }}>
            {formatQualityScore(latest)}
          </div>
        </div>
        <div style={{ 
          padding: '10px 12px', 
          borderRadius: '8px', 
          background: '#fef3c7', 
          border: '1px solid #fde68a' 
        }}>
          <div style={{ fontSize: '10px', color: '#a16207', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Peor
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#a16207', marginTop: '2px' }}>
            {formatQualityScore(worst)}
          </div>
        </div>
      </div>

      {microDrops > 0 && (
        <div style={{ 
          padding: '12px', 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '10px', 
          marginBottom: '14px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#b91c1c' }}>
            Microcortes detectados
          </div>
          <div style={{ fontSize: '14px', color: '#991b1b', marginTop: '4px' }}>
            {microDrops} eventos · {formatDuration(microDuration)}
          </div>
        </div>
      )}

      {history.length > 1 ? (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Evolución de señal (24h)
          </div>
          <SignalQualitySparkline samples={history} threshold={signalThreshold} />
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '14px' }}>
          No hay historial de señal disponible
        </div>
      )}

      {connectivitySeries && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Conectividad (estable · inestable)
          </div>
          <ConnectivityTimeline series={connectivitySeries} />
        </div>
      )}

      {clients.length > 0 && (
        <div style={{ 
          borderTop: '2px solid #cbd5e1', 
          paddingTop: '14px',
          marginTop: '14px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Clientes con peor señal
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#64748b', display: 'grid', gap: '6px', lineHeight: '1.5' }}>
            {clients.slice(0, 4).map((client) => (
              <li key={client.id || client.mac}>
                <strong style={{ color: '#475569' }}>{client.label || client.mac || client.id}</strong> · {formatQualityScore(client.signalQuality)} {client.ssid ? `· ${client.ssid}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const SummaryChip = ({ label, value, accent = '#1f2937' }) => (
  <div style={{ padding: '8px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', minWidth: 120 }}>
    <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, color: accent }}>{value}</div>
  </div>
);

const SwitchPortsGrid = ({ ports = [] }) => {
  if (!ports.length) return <div style={{ fontSize: 13, color: '#64748b' }}>Sin información de puertos disponible.</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8, overflow: 'visible' }}>
      {ports.map((port) => {
        const color = resolvePortColor(port);
        const label = port.status || port.statusNormalized || 'unknown';
        const isConnected = normalizeReachability(port.statusNormalized || port.status) === 'connected';
        const bgColor = isConnected ? '#a7f3d0' : '#fff'; // Verde más vibrante (era #d1fae5)
        
        // Construir tooltip para el puerto
        const portTooltip = (
          <div>
            <div className="tooltip-title">Puerto {port.portId}</div>
            <div className="tooltip-row">
              <span className="tooltip-label">Estado</span>
              <span className="tooltip-value">{port.status || 'Desconocido'}</span>
            </div>
            {port.name && (
              <div className="tooltip-row">
                <span className="tooltip-label">Nombre</span>
                <span className="tooltip-value">{port.name}</span>
              </div>
            )}
            {port.vlan && (
              <div className="tooltip-row">
                <span className="tooltip-label">VLAN</span>
                <span className="tooltip-value">{port.vlan}</span>
              </div>
            )}
            {port.type && (
              <div className="tooltip-row">
                <span className="tooltip-label">Tipo</span>
                <span className="tooltip-value">{port.type}</span>
              </div>
            )}
            {port.speed && (
              <div className="tooltip-row">
                <span className="tooltip-label">Velocidad</span>
                <span className="tooltip-value">{port.speed}</span>
              </div>
            )}
            {port.duplex && (
              <div className="tooltip-row">
                <span className="tooltip-label">Duplex</span>
                <span className="tooltip-value">{port.duplex}</span>
              </div>
            )}
            {port.poeEnabled && (
              <div className="tooltip-row">
                <span className="tooltip-label">PoE</span>
                <span className="tooltip-value">Habilitado</span>
              </div>
            )}
            {port.linkNegotiation && (
              <div className="tooltip-row">
                <span className="tooltip-label">Negociación</span>
                <span className="tooltip-value">{port.linkNegotiation}</span>
              </div>
            )}
            {port.isUplink && (
              <div className="tooltip-row">
                <span className="tooltip-label">Función</span>
                <span className="tooltip-value">Puerto Uplink</span>
              </div>
            )}
            {port.enabled !== undefined && (
              <div className="tooltip-row">
                <span className="tooltip-label">Habilitado</span>
                <span className="tooltip-value">{port.enabled ? 'Sí' : 'No'}</span>
              </div>
            )}
          </div>
        );
        
        return (
          <Tooltip key={port.portId} content={portTooltip} position="auto">
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: bgColor, position: 'relative', cursor: 'pointer' }}>
              <div style={{ fontWeight: 600, color: color }}>{port.portId}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{label}</div>
              {port.isUplink && (
                <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, background: '#1d4ed8', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>Uplink</span>
              )}
              {port.poeEnabled && (
                <span style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, background: '#047857', color: '#fff', borderRadius: 999, padding: '1px 6px' }}>PoE</span>
              )}
              {port.vlan && (
                <div style={{ fontSize: 11, color: '#64748b' }}>VLAN {port.vlan}</div>
              )}
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
};

const SwitchCard = ({ sw }) => {
  const statusColor = getStatusColor(sw.status);
  const stats = sw.stats || {};
  const portsToShow = Array.isArray(sw.ports) ? sw.ports : [];
  
  const isOnline = normalizeReachability(sw.status) === 'connected';

  // Información de uplink (conexión al appliance/upstream)
  const uplinkInfo = sw.connectedTo || null;

  // Construir contenido del tooltip para el switch
  const switchTooltip = sw.tooltipInfo ? (
    <div>
      <div className="tooltip-title">{sw.tooltipInfo.name}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Modelo</span>
        <span className="tooltip-value">{sw.tooltipInfo.model}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Serial</span>
        <span className="tooltip-value">{sw.tooltipInfo.serial}</span>
      </div>
      {sw.tooltipInfo.mac && (
        <div className="tooltip-row">
          <span className="tooltip-label">MAC</span>
          <span className="tooltip-value">{sw.tooltipInfo.mac}</span>
        </div>
      )}
      <div className="tooltip-row">
        <span className="tooltip-label">Firmware</span>
        <span className="tooltip-value">{sw.tooltipInfo.firmware || 'N/A'}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">LAN IP</span>
        <span className="tooltip-value">{sw.tooltipInfo.lanIp || 'N/A'}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Puertos activos</span>
        <span className="tooltip-value">{sw.tooltipInfo.connectedPorts}/{sw.tooltipInfo.totalPorts}</span>
      </div>
      {sw.tooltipInfo.poePorts > 0 && (
        <div className="tooltip-row">
          <span className="tooltip-label">PoE</span>
          <span className="tooltip-value">{sw.tooltipInfo.poeActivePorts}/{sw.tooltipInfo.poePorts} activos</span>
        </div>
      )}
      {sw.tooltipInfo.connectedTo && sw.tooltipInfo.connectedTo !== '-' && (
        <>
          <div className="tooltip-row">
            <span className="tooltip-label">Conectado a</span>
            <span className="tooltip-value">{sw.tooltipInfo.connectedTo}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Detección</span>
            <span className="tooltip-value">{sw.tooltipInfo.detectionMethod}</span>
          </div>
        </>
      )}
    </div>
  ) : null;

  return (
    <div className="modern-card">
      <div className="modern-card-header">
        <div>
          <Tooltip content={switchTooltip || "Switch sin tooltipInfo"} position="auto">
            <h3 className="modern-card-title" style={{ cursor: 'pointer' }}>{sw.name || sw.serial}</h3>
          </Tooltip>
          <p className="modern-card-subtitle">
            {sw.model} · {sw.serial}
          </p>
          {sw.lanIp && (
            <p className="modern-card-subtitle" style={{ marginTop: '2px' }}>
              IP: {sw.lanIp}
            </p>
          )}
          {uplinkInfo && uplinkInfo !== '-' && (
            <div 
              style={{ 
                marginTop: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#1e40af',
                fontWeight: '600'
              }}
              title={`Switch conectado a: ${uplinkInfo}`}
            >
              <span style={{ fontSize: '14px' }}>Uplink</span>
              <span>→ {uplinkInfo}</span>
            </div>
          )}
        </div>
        <span 
          className={`status-badge ${isOnline ? 'online' : 'offline'}`}
          style={{ 
            background: isOnline ? '#d1fae5' : '#fee2e2',
            color: statusColor 
          }}
        >
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: statusColor 
          }} />
          {sw.status}
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
        gap: '12px', 
        marginBottom: '18px',
        padding: '14px',
        background: '#f1f5f9',
        borderRadius: '10px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>
            {stats.totalPorts || 0}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Activos
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669', marginTop: '2px' }}>
            {stats.connectedPorts || 0}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Inactivos
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b', marginTop: '2px' }}>
            {stats.inactivePorts || 0}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            PoE
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6', marginTop: '2px' }}>
            {stats.poeActivePorts || 0}
          </div>
        </div>
      </div>

      {/* Ports grid */}
      <div>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: '600', 
          color: '#475569', 
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Puertos ({portsToShow.length})
        </div>
        <SwitchPortsGrid ports={portsToShow} />
      </div>
    </div>
  );
};


export default function Dashboard({ onLogout }) {
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [section, setSection] = useState('topology');
  const [summaryData, setSummaryData] = useState(null); // Estado único para todos los datos
  const [loadedSections, setLoadedSections] = useState(new Set()); // Track de secciones cargadas
  const [sectionLoading, setSectionLoading] = useState(null); // Sección actual cargándose
  const [loading, setLoading] = useState(false);
  const [uplinkRange, setUplinkRange] = useState(DEFAULT_UPLINK_TIMESPAN);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [switchesTab, setSwitchesTab] = useState('list'); // 'list' o 'ports'
  const [enrichedAPs, setEnrichedAPs] = useState(null); // Datos completos de APs con LLDP/CDP
  const [loadingLLDP, setLoadingLLDP] = useState(false); // Estado de carga de datos LLDP
  const hasAppliedPreferredRef = useRef(false);

  // Track window width to enable mobile-specific rendering without affecting desktop
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return undefined;
  }, []);

  const isMobile = windowWidth <= 900;

  // Counts used in mobile section tiles (fall back to 0)
  const mobileCounts = {
    topology: summaryData?.topology?.nodes?.length || 0,
    switches: Array.isArray(summaryData?.devices) ? summaryData.devices.filter(d => (d.model || '').toLowerCase().startsWith('ms')).length : 0,
    access_points: Array.isArray(summaryData?.devices) ? summaryData.devices.filter(d => (d.model || '').toLowerCase().startsWith('mr')).length : 0,
    appliance_status: Array.isArray(summaryData?.applianceStatus) ? summaryData.applianceStatus.length : 0,
  };

  const availableSections = useMemo(() => {
    if (!summaryData) return DEFAULT_SECTIONS;

    const flags = summaryData.networkFlags || {};
    const deviceProfile = summaryData.networkMetadata?.deviceProfile || {};
    const deviceList = Array.isArray(summaryData.devices) ? summaryData.devices : [];
    const topologyNodes = Array.isArray(summaryData.topology?.nodes) ? summaryData.topology.nodes.length : 0;

    const calcHasSwitches = (deviceProfile.switches ?? 0) > 0 || deviceList.some(d => (d.model || '').toLowerCase().startsWith('ms'));
    const calcHasAps = (deviceProfile.accessPoints ?? 0) > 0 || deviceList.some(d => (d.model || '').toLowerCase().startsWith('mr'));
    const calcHasAppliance = (Array.isArray(summaryData.applianceStatus) && summaryData.applianceStatus.length > 0) || deviceList.some(d => /(mx|utm|z)/i.test(d.model || ''));

    const showTopology = !((flags.hideTopology ?? false) || topologyNodes === 0);
    const showSwitches = (flags.hideSwitches === true) ? false : (flags.hasSwitches ?? calcHasSwitches);
    const keepApTab = flags.flavor === 'GAP' || flags.flavor === 'GTW' || flags.hasTeleworkers;
    const showAccessPoints = (flags.hideAccessPoints === true) ? false : ((flags.hasAccessPoints ?? calcHasAps) || keepApTab);
    const showAppliance = (flags.hideAppliance === true) ? false : ((flags.hasAppliance ?? calcHasAppliance) || keepApTab || flags.usesUtm || flags.usesGtw);

    const filtered = DEFAULT_SECTIONS.filter((item) => {
      if (item.k === 'topology') return showTopology;
      if (item.k === 'switches') return showSwitches;
      if (item.k === 'access_points') return showAccessPoints;
      if (item.k === 'appliance_status') return showAppliance;
      return true;
    });

    if (filtered.length) {
      const preferred = summaryData?.networkFlags?.defaultSection;
      if (preferred) {
        filtered.sort((a, b) => {
          if (a.k === preferred && b.k !== preferred) return -1;
          if (b.k === preferred && a.k !== preferred) return 1;
          return 0;
        });
      }
      return filtered;
    }
    return [{ k: 'appliance_status', t: 'Appliance Status' }];
  }, [summaryData]);

  const preferredSection = summaryData?.networkFlags?.defaultSection;

  useEffect(() => {
    hasAppliedPreferredRef.current = false;
  }, [summaryData]);

  useEffect(() => {
    const metaTimespan = summaryData?.applianceMetricsMeta?.uplinkTimespan;
    if (metaTimespan && Number(metaTimespan) !== Number(uplinkRange)) {
      setUplinkRange(Number(metaTimespan));
    }
  }, [summaryData?.applianceMetricsMeta?.uplinkTimespan, uplinkRange]);

  // Limpiar datos enriquecidos de APs cuando cambia la red
  useEffect(() => {
    setEnrichedAPs(null);
  }, [selectedNetwork?.id]);

  // Cargar datos completos de APs con LLDP/CDP cuando se selecciona access_points
  useEffect(() => {
    if (!selectedNetwork?.id) return;
    if (section !== 'access_points') return;
    
    // No limpiar enrichedAPs aquí para mantener datos anteriores mientras carga
    
    const fetchEnrichedAPs = async () => {
      setLoadingLLDP(true);
      try {
        const url = `/api/networks/${selectedNetwork.id}/section/access_points`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();

          if (data && Array.isArray(data.accessPoints)) {
            setEnrichedAPs(data.accessPoints);
          } else {
            console.warn('Respuesta no contiene array accessPoints:', data);
          }
        } else {
          console.error('Respuesta no OK:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Error cargando datos completos de APs:', err);
      } finally {
        setLoadingLLDP(false);
      }
    };
    
    fetchEnrichedAPs();
  }, [selectedNetwork?.id, section]);

  // Carga lazy de una sección específica
  const loadSection = useCallback(async (sectionKey, { force = false } = {}) => {
    if (!selectedNetwork?.id) return;
    
    // Si ya está cargada y no es force, skip
    if (loadedSections.has(sectionKey) && !force) {
        console.debug(`Sección '${sectionKey}' ya cargada, omitiendo`);
        return;
      }
    
    setSectionLoading(sectionKey);
  console.debug(`Cargando sección '${sectionKey}'...`);
    
    try {
      const params = new URLSearchParams();
      if (sectionKey === 'appliance_status') {
        params.set('uplinkTimespan', uplinkRange || DEFAULT_UPLINK_TIMESPAN);
        params.set('uplinkResolution', DEFAULT_UPLINK_RESOLUTION);
      }
      
      const url = `/api/networks/${selectedNetwork.id}/section/${sectionKey}${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error cargando sección ${sectionKey}`);
      }
      
  const sectionData = await response.json();
  console.debug(`Sección '${sectionKey}' cargada:`, sectionData);
      
      // Merge con summaryData existente
      setSummaryData(prev => {
        const merged = { ...prev };
        
        // Mapear los datos de la sección al formato de summaryData
        switch (sectionKey) {
          case 'topology':
            merged.topology = sectionData.topology;
            if (sectionData.devices && !prev?.devices) merged.devices = sectionData.devices;
            break;
          case 'switches':
            merged.switchesDetailed = sectionData.switchesDetailed;
            merged.switchesOverview = sectionData.switchesOverview;
            break;
          case 'access_points':
            merged.accessPoints = sectionData.accessPoints;
            break;
          case 'appliance_status':
            merged.applianceStatus = sectionData.applianceStatus;
            if (sectionData.topology) merged.topology = sectionData.topology;
            break;
        }
        
        return merged;
      });
      
      // Marcar como cargada
      setLoadedSections(prev => new Set(prev).add(sectionKey));
      
    } catch (error) {
  console.error(`Error cargando '${sectionKey}':`, error);
  setError(`Error cargando ${sectionKey}: ${error.message}`);
    } finally {
      setSectionLoading(null);
    }
  }, [selectedNetwork, loadedSections, uplinkRange]);

  const buildSummaryUrl = (networkId, { timespan, resolution, quick = true } = {}) => {
    const params = new URLSearchParams();
    const ts = timespan ?? uplinkRange ?? DEFAULT_UPLINK_TIMESPAN;
    const res = resolution ?? DEFAULT_UPLINK_RESOLUTION;
    if (ts) params.set('uplinkTimespan', ts);
    if (res) params.set('uplinkResolution', res);
    if (quick) params.set('quick', 'true'); // Modo rápido por defecto
    const query = params.toString();
    return `/api/networks/${networkId}/summary${query ? `?${query}` : ''}`;
  };

  const loadSummary = async ({ networkId, timespan, resolution, keepPrevious = false }) => {
    if (!networkId) return null;

    if (!keepPrevious) {
      setSummaryData(null);
      setLoadedSections(new Set()); // Reset secciones cargadas
    }

    const url = buildSummaryUrl(networkId, { timespan, resolution });
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al cargar los datos del predio');
    const data = await response.json();
    setSummaryData(data);
      
      // Marcar todas las secciones como cargadas (modo completo)
      setLoadedSections(new Set(['topology', 'switches', 'access_points', 'appliance_status']));
      
  // Nota: información de predio (registro suprimido para consola)
      console.debug('networkMetadata:', data?.networkMetadata);
      console.debug('predioInfo:', data?.networkMetadata?.predioInfo);
      console.debug('wirelessInsights:', data?.wirelessInsights);
      if (data?.wirelessInsights?.devices?.length > 0) {
        console.debug('Primer wireless device del summary:', JSON.stringify(data.wirelessInsights.devices[0], null, 2));
      }
      
      // Enriquecer selectedNetwork con predio_code si está disponible
      if (data?.networkMetadata?.predioInfo?.predio_code) {
  console.log('Actualizando selectedNetwork con predio_code:', data.networkMetadata.predioInfo.predio_code);
        setSelectedNetwork(prev => ({
          ...prev,
          predio_code: data.networkMetadata.predioInfo.predio_code
        }));
      } else {
  console.warn('No se encontró predio_code en predioInfo');
    }
    
    return data;
  };

  useEffect(() => {
    if (!availableSections.length) return;

    const availableKeys = new Set(availableSections.map(item => item.k));

    if (!availableKeys.has(section)) {
      const fallback = (preferredSection && availableKeys.has(preferredSection))
        ? preferredSection
        : availableSections[0].k;
      if (fallback && fallback !== section) {
        setSection(fallback);
        hasAppliedPreferredRef.current = true;
      }
      return;
    }

    if (!hasAppliedPreferredRef.current && preferredSection && preferredSection !== section && availableKeys.has(preferredSection)) {
      setSection(preferredSection);
      hasAppliedPreferredRef.current = true;
    }
  }, [availableSections, preferredSection, section, setSection]);

  // Efecto para carga lazy cuando cambia de sección
  useEffect(() => {
    if (!selectedNetwork?.id || !section || !summaryData) return;
    
    // Access Points NO necesita loadSection, usa datos del summary directamente
    // El enriquecimiento LLDP se hace en background con el otro useEffect
    if (section === 'access_points') {
      // Marcar como cargada para evitar spinner innecesario
      setLoadedSections(prev => new Set(prev).add('access_points'));
      return;
    }
    
    // Si la sección no está cargada, cargarla
    if (!loadedSections.has(section)) {
      console.debug(`Sección '${section}' no cargada, iniciando carga...`);
      loadSection(section);
    }
  }, [section, selectedNetwork, loadedSections, summaryData, loadSection]);

  const search = async (q) => {
    setError('');
    setSummaryData(null);
    setLoadedSections(new Set());
    setUplinkRange(DEFAULT_UPLINK_TIMESPAN);
    if (!q) return;

    setLoading(true);
    try {
      const resolveRes = await fetch(`/api/resolve-network?q=${encodeURIComponent(q)}`);
      
      let network = null;
      
      if (resolveRes.ok) {
        const resolveData = await resolveRes.json();
        network = resolveData.network || (Array.isArray(resolveData.networks) && resolveData.networks[0]);
      } else if (resolveRes.status === 404) {
        // Predio no encontrado en catálogo, pero puede ser un network ID válido
        // Intentar usar el query como network ID directamente
  console.warn('Predio no encontrado en catálogo, intentando como network ID directo');
        network = { id: q, name: q };
      } else {
        throw new Error('Error al buscar el predio');
      }
      
      if (!network) throw new Error('No se pudo determinar el network del predio');
      
      setSelectedNetwork(network);
      
      // Guardar en predios recientes
      try {
        const recentPredios = JSON.parse(localStorage.getItem('recentPredios') || '[]');
        const newPredio = {
          id: network.predio_code || network.id,
          name: network.predio_name || network.name || '',
          timestamp: Date.now()
        };
        
        // Evitar duplicados y mantener los últimos 10
        const filtered = recentPredios.filter(p => p.id !== newPredio.id);
        const updated = [newPredio, ...filtered].slice(0, 10);
        localStorage.setItem('recentPredios', JSON.stringify(updated));
      } catch (e) {
        console.debug('No se pudo guardar en predios recientes', e);
      }
      
      // Cargar resumen completo (mantener para metadatos y flags)
      await loadSummary({ 
        networkId: network.id, 
        timespan: DEFAULT_UPLINK_TIMESPAN, 
        resolution: DEFAULT_UPLINK_RESOLUTION, 
        keepPrevious: false
      });
      
      // La sección se cargará automáticamente por el useEffect

    } catch (e) {
      setError(e.message || 'Error buscando o cargando el predio');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Funciones de captura y exportación
  const captureAndDownloadImage = async (sectionName) => {
    try {
      // Pequeño delay para asegurar renderizado completo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = document.body;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        foreignObjectRendering: true,
        removeContainer: true,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Asegurar que los SVG se rendericen correctamente
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach(svg => {
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            const bbox = svg.getBBox();
            if (!svg.hasAttribute('width')) svg.setAttribute('width', bbox.width);
            if (!svg.hasAttribute('height')) svg.setAttribute('height', bbox.height);
          });
        }
      });
      
      const predioCode = selectedNetwork?.predio_code || selectedNetwork?.id || 'unknown';
      const fileName = `${sectionName} ${predioCode}.jpg`;
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error capturando imagen:', error);
      alert('Error al generar la imagen. Por favor intenta nuevamente.');
    }
  };

  const captureAndDownloadPDF = async (sectionName) => {
    try {
      // Pequeño delay para asegurar renderizado completo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = document.body;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        foreignObjectRendering: true,
        removeContainer: true,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Asegurar que los SVG se rendericen correctamente
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach(svg => {
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            const bbox = svg.getBBox();
            if (!svg.hasAttribute('width')) svg.setAttribute('width', bbox.width);
            if (!svg.hasAttribute('height')) svg.setAttribute('height', bbox.height);
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      
      const predioCode = selectedNetwork?.predio_code || selectedNetwork?.id || 'unknown';
      const fileName = `${sectionName} ${predioCode}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta nuevamente.');
    }
  };

  const sortData = (data, key, direction) => {
    if (!key) return data;
    
    const sorted = [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      // Normalizar valores
      if (key === 'status') {
        aVal = normalizeReachability(aVal);
        bVal = normalizeReachability(bVal);
      }
      
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  const SortableHeader = ({ label, sortKey, align = 'left', width }) => {
    const isActive = sortConfig.key === sortKey;
    const direction = isActive ? sortConfig.direction : null;
    
    return (
      <th 
        style={{ 
          textAlign: align,
          width: width,
          cursor: 'pointer', 
          userSelect: 'none',
          position: 'relative',
          paddingRight: '20px'
        }}
        onClick={() => handleSort(sortKey)}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {label}
          <span style={{ 
            display: 'inline-flex', 
            flexDirection: 'column', 
            marginLeft: '2px',
            opacity: isActive ? 1 : 0.3
          }}>
            <span style={{ 
              fontSize: '8px', 
              lineHeight: '6px',
              color: (isActive && direction === 'asc') ? '#2563eb' : '#94a3b8'
            }}>▲</span>
            <span style={{ 
              fontSize: '8px', 
              lineHeight: '6px',
              color: (isActive && direction === 'desc') ? '#2563eb' : '#94a3b8'
            }}>▼</span>
          </span>
        </div>
      </th>
    );
  };

  // El useEffect ya no es necesario para cargar secciones, ahora es síncrono
  
  const renderSection = () => {
    if (loading) return <LoadingOverlay isLoading={true} message="Cargando datos del predio..." variant="blur" />;
  if (!selectedNetwork) return <div className="empty-predio">Busca un predio en la barra superior…</div>;
    if (!summaryData) return <div>No hay datos disponibles para este predio.</div>;

    const sectionAvailable = availableSections.some(item => item.k === section);
    if (!sectionAvailable) {
      return <div style={{ padding: '12px', color: '#64748b' }}>Selecciona una sección disponible.</div>;
    }

    // Extraer datos de la sección desde el objeto summaryData
    const { devices = [], topology = null, applianceStatus = [], switchPorts = [], deviceStatuses = [], switchesDetailed = [], switchesOverview = null, wirelessInsights = null } = summaryData;
    const statusMap = new Map(deviceStatuses.map(d => {
      const raw = d.status || d.reachability || d.connectionStatus;
      return [d.serial, raw];
    }));

    // Mostrar skeleton loader si esta sección está cargándose
    if (sectionLoading === section) {
      // Determinar qué skeleton mostrar según la sección
      if (section === 'topology') {
        return <SkeletonTopology />;
      } else if (section === 'switches' || section === 'access_points' || section === 'appliance_status') {
        return (
          <div className="animate-fadeIn">
            {section === 'switches' || section === 'access_points' ? (
              <SkeletonDeviceList count={5} />
            ) : (
              <SkeletonTable rows={4} columns={5} />
            )}
          </div>
        );
      } else {
        return <SkeletonTable rows={5} columns={4} />;
      }
    }

    switch (section) {
      case 'topology':
        // Mobile: render the same graph as desktop inside a pan/zoom-friendly wrapper.
        // IMPORTANT: This replaces the previous compact list for topology on mobile.
        // It intentionally keeps the same `SimpleGraph` component so desktop layout is unchanged.
        if (isMobile) {
          return (
            <div>
              <h2 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>Topología</h2>
              {topology?.nodes && topology.nodes.length > 0 ? (
                <div className="mobile-topology-graph-wrapper">
                  <div className="mobile-topology-graph" role="region" aria-label="Topología - gráfico desplazable">
                    <div className="mobile-topology-graph-inner">
                      {/* Reuse the same SimpleGraph used on desktop; wrapping enables horizontal scroll/zoom on mobile */}
                      <Suspense fallback={<SkeletonTopology />}>
                        <SimpleGraph graph={topology} devices={devices} />
                      </Suspense>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px', color: '#57606a' }}>No hay datos de topología para este predio.</div>
              )}
            </div>
          );
        }

        return (
          <>
            <h2 style={{ 
              margin: '0 0 20px 0', 
              color: '#1e293b', 
              fontSize: '20px', 
              fontWeight: '600',
              borderBottom: '2px solid #cbd5e1',
              paddingBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {topology?.nodes && topology.nodes.length > 0 && (
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#047857',
                    background: '#d1fae5',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 4px rgba(16, 185, 129, 0.6)'
                    }}></span>
                    {topology.nodes.length} Dispositivo{topology.nodes.length !== 1 ? 's' : ''} en Línea
                  </span>
                )}
                <span>Topología</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => captureAndDownloadImage('Topologia')}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Descargar como JPG"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  JPG
                </button>
                <button
                  onClick={() => captureAndDownloadPDF('Topologia')}
                  style={{
                    padding: '8px 16px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Descargar como PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  PDF
                </button>
              </div>
            </h2>
            {topology?.nodes && topology.nodes.length > 0 ? (
              <div style={{ overflow: 'hidden' }}>
                <Suspense fallback={<SkeletonTopology />}>
                  <SimpleGraph graph={topology} devices={devices} />
                </Suspense>
              </div>
            ) : (
              <div style={{ padding: '12px', color: '#57606a' }}>
                No hay datos de topología para este predio. El backend intentará construir una si hay datos de conexión.
              </div>
            )}
          </>
        );

      case 'switches': {
        const switchesData = Array.isArray(switchesDetailed) && switchesDetailed.length 
          ? switchesDetailed 
          : devices.filter(d => d.model?.toLowerCase().startsWith('ms')).map(sw => {
              const ports = switchPorts.filter(p => p.serial === sw.serial);
              return {
                ...sw,
                status: statusMap.get(sw.serial) || sw.status,
                totalPorts: ports.length,
                activePorts: ports.filter(p => {
                  if (p.enabled === false) return false;
                  const normalized = normalizeReachability(p.statusNormalized || p.status);
                  return normalized === 'connected';
                }).length
              };
            });

        if (!switchesData.length) {
          return (
            <div style={{ padding: '12px', color: '#57606a' }}>
              No hay switches para esta red
            </div>
          );
        }
        // Mobile optimized list
        if (isMobile) {
          const mobileList = sortData(switchesData, sortConfig.key, sortConfig.direction);
          return (
            <div>
              <h2 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>Switches</h2>
              <div className="mobile-device-list">
                {mobileList.map((sw) => {
                  const statusColor = getStatusColor(sw.status);
                  const subline = sw.serial || sw.lanIp || sw.connectedTo || '';
                  const swTooltip = (sw.tooltipInfo || sw) ? (
                    <div>
                      <div className="tooltip-title">{(sw.tooltipInfo && sw.tooltipInfo.name) || sw.name || sw.serial}</div>
                      <div className="tooltip-row"><span className="tooltip-label">Modelo</span><span className="tooltip-value">{(sw.tooltipInfo && sw.tooltipInfo.model) || sw.model || '-'}</span></div>
                      <div className="tooltip-row"><span className="tooltip-label">Serial</span><span className="tooltip-value">{(sw.tooltipInfo && sw.tooltipInfo.serial) || sw.serial || '-'}</span></div>
                      <div className="tooltip-row"><span className="tooltip-label">Firmware</span><span className="tooltip-value">{(sw.tooltipInfo && sw.tooltipInfo.firmware) || sw.firmware || 'N/A'}</span></div>
                      <div className="tooltip-row"><span className="tooltip-label">LAN IP</span><span className="tooltip-value">{(sw.tooltipInfo && sw.tooltipInfo.lanIp) || sw.lanIp || '-'}</span></div>
                      <div className="tooltip-row"><span className="tooltip-label">Puertos activos</span><span className="tooltip-value">{(sw.tooltipInfo && (sw.tooltipInfo.connectedPorts != null ? sw.tooltipInfo.connectedPorts : null)) ?? sw.activePorts ?? (sw.connectedPorts || 0)}/{(sw.tooltipInfo && (sw.tooltipInfo.totalPorts != null ? sw.tooltipInfo.totalPorts : null)) ?? sw.totalPorts ?? (sw.ports ? sw.ports.length : '-')}</span></div>
                      {((sw.tooltipInfo && sw.tooltipInfo.poePorts) || sw.poePorts) ? (
                        <div className="tooltip-row"><span className="tooltip-label">PoE</span><span className="tooltip-value">{(sw.tooltipInfo && sw.tooltipInfo.poeActivePorts) || sw.poeActivePorts || 0}/{(sw.tooltipInfo && sw.tooltipInfo.poePorts) || sw.poePorts || 0} activos</span></div>
                      ) : null}
                      {(sw.tooltipInfo && sw.tooltipInfo.connectedTo) || sw.connectedTo ? (
                        <div className="tooltip-row"><span className="tooltip-label">Conectado a</span><span className="tooltip-value">{(sw.tooltipInfo && sw.tooltipInfo.connectedTo) || sw.connectedTo}</span></div>
                      ) : null}
                      {(sw.tooltipInfo && sw.tooltipInfo.detectionMethod) || sw.detectionMethod ? (
                        <div className="tooltip-row"><span className="tooltip-label">Detección</span><span className="tooltip-value">{(sw.tooltipInfo && sw.tooltipInfo.detectionMethod) || sw.detectionMethod}</span></div>
                      ) : null}
                    </div>
                  ) : null;

                  return (
                    <div key={sw.serial} className="mobile-device-item">
                      <Tooltip content={swTooltip || "Switch"} position="auto" modalOnMobile={true}>
                        <button className="mobile-device-button" style={{ display: 'flex', alignItems: 'center', width: '100%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                            <div className="mobile-device-icon"><SwitchIcon /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sw.name || sw.serial}</div>
                              <div className="mobile-device-subline">{subline}</div>
                            </div>
                            <div style={{ marginLeft: 8, flex: '0 0 auto' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: normalizeReachability(sw.status) === 'connected' ? '#d1fae5' : '#fee2e2' }}>
                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: statusColor }} />
                              </span>
                            </div>
                          </div>
                        </button>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, overflow: 'visible' }}>
            <h2 style={{ 
              margin: '0 0 12px 0', 
              color: '#1e293b', 
              fontSize: '20px', 
              fontWeight: '600',
              borderBottom: '2px solid #cbd5e1',
              paddingBottom: '12px'
            }}>
              Switches
            </h2>

            {/* Tabs */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              borderBottom: '1px solid #cbd5e1',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => setSwitchesTab('list')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: switchesTab === 'list' ? '2px solid #2563eb' : '2px solid transparent',
                  color: switchesTab === 'list' ? '#2563eb' : '#64748b',
                  fontWeight: switchesTab === 'list' ? '600' : '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Switches
              </button>
              <button
                onClick={() => setSwitchesTab('ports')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: switchesTab === 'ports' ? '2px solid #2563eb' : '2px solid transparent',
                  color: switchesTab === 'ports' ? '#2563eb' : '#64748b',
                  fontWeight: switchesTab === 'ports' ? '600' : '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Puertos
              </button>
            </div>

            {/* Contenido según tab */}
            {switchesTab === 'list' ? (
              <>
                {switchesOverview && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    marginBottom: '20px',
                    padding: '14px',
                    background: '#f1f5f9',
                    borderRadius: '10px'
                  }}>
                    <SummaryChip label="Total Switches" value={switchesOverview.totalSwitches} accent="#1f2937" />
                    <SummaryChip 
                      label="Online" 
                      value={switchesData.filter(sw => normalizeReachability(sw.status) === 'connected').length} 
                      accent="#059669" 
                    />
                    <SummaryChip 
                      label="Offline" 
                      value={switchesData.filter(sw => normalizeReachability(sw.status) === 'disconnected').length} 
                      accent="#ef4444" 
                    />
                  </div>
                )}

                <div style={{ overflowX: 'visible', overflowY: 'visible', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <table className="modern-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead>
                      <tr>
                        <SortableHeader label="Status" sortKey="status" align="center" width="8%" />
                        <SortableHeader label="Name" sortKey="name" align="left" width="18%" />
                        <SortableHeader label="Model" sortKey="model" align="left" width="12%" />
                        <SortableHeader label="Serial" sortKey="serial" align="left" width="15%" />
                        <th style={{ textAlign: 'left', width: '22%' }}>Connectivity (UTC-3)</th>
                        <SortableHeader label="MAC address" sortKey="mac" align="left" width="15%" />
                        <SortableHeader label="LAN IP" sortKey="lanIp" align="left" width="10%" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortData(switchesData, sortConfig.key, sortConfig.direction).map((sw) => {
                        const statusColor = getStatusColor(sw.status);
                        const isOnline = normalizeReachability(sw.status) === 'connected';
                        
                        // Construir tooltip para la tabla (igual que en SwitchCard)
                        const switchTooltip = sw.tooltipInfo ? (
                          <div>
                            <div className="tooltip-title">{sw.tooltipInfo.name}</div>
                            <div className="tooltip-row">
                              <span className="tooltip-label">Modelo</span>
                              <span className="tooltip-value">{sw.tooltipInfo.model}</span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-label">Serial</span>
                              <span className="tooltip-value">{sw.tooltipInfo.serial}</span>
                            </div>
                            {sw.tooltipInfo.mac && (
                              <div className="tooltip-row">
                                <span className="tooltip-label">MAC</span>
                                <span className="tooltip-value">{sw.tooltipInfo.mac}</span>
                              </div>
                            )}
                            <div className="tooltip-row">
                              <span className="tooltip-label">Firmware</span>
                              <span className="tooltip-value">{sw.tooltipInfo.firmware || 'N/A'}</span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-label">LAN IP</span>
                              <span className="tooltip-value">{sw.tooltipInfo.lanIp || 'N/A'}</span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-label">Puertos activos</span>
                              <span className="tooltip-value">{sw.tooltipInfo.connectedPorts}/{sw.tooltipInfo.totalPorts}</span>
                            </div>
                            {sw.tooltipInfo.poePorts > 0 && (
                              <div className="tooltip-row">
                                <span className="tooltip-label">PoE</span>
                                <span className="tooltip-value">{sw.tooltipInfo.poeActivePorts}/{sw.tooltipInfo.poePorts} activos</span>
                              </div>
                            )}
                            {sw.tooltipInfo.connectedTo && sw.tooltipInfo.connectedTo !== '-' && (
                              <>
                                <div className="tooltip-row">
                                  <span className="tooltip-label">Conectado a</span>
                                  <span className="tooltip-value">{sw.tooltipInfo.connectedTo}</span>
                                </div>
                                <div className="tooltip-row">
                                  <span className="tooltip-label">Detección</span>
                                  <span className="tooltip-value">{sw.tooltipInfo.detectionMethod}</span>
                                </div>
                              </>
                            )}
                          </div>
                        ) : null;
                        
                        return (
                          <tr key={sw.serial}>
                            <td style={{ textAlign: 'center', padding: '10px 6px' }}>
                              <span 
                                style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: isOnline ? '#d1fae5' : '#fee2e2',
                                }}
                              >
                                <span style={{ 
                                  width: '9px', 
                                  height: '9px', 
                                  borderRadius: '50%', 
                                  background: statusColor 
                                }} />
                              </span>
                            </td>
                            <td style={{ textAlign: 'left', fontSize: '14px', padding: '10px 12px', overflow: 'visible', position: 'relative' }}>
                              <Tooltip content={switchTooltip || "Switch sin tooltipInfo"} position="auto">
                                <span style={{ 
                                  color: '#2563eb', 
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-block',
                                  position: 'relative',
                                  zIndex: 1
                                }}>
                                  {sw.name || sw.serial}
                                </span>
                              </Tooltip>
                            </td>
                            <td style={{ textAlign: 'left', fontSize: '13px', color: '#64748b', padding: '10px 12px' }}>
                              {sw.model || '-'}
                            </td>
                            <td style={{ textAlign: 'left', fontSize: '12px', color: '#64748b', padding: '10px 12px', fontFamily: 'monospace' }}>
                              {sw.serial}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <ConnectivityBar device={sw} />
                            </td>
                            <td style={{ textAlign: 'left', fontSize: '12px', color: '#64748b', padding: '10px 12px', fontFamily: 'monospace' }}>
                              {sw.mac || '-'}
                            </td>
                            <td style={{ textAlign: 'left', fontSize: '13px', color: '#64748b', padding: '10px 12px', fontFamily: 'monospace' }}>
                              {sw.lanIp || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, overflow: 'visible' }}>
                  {switchesDetailed && switchesDetailed.length > 0 ? (
                    switchesDetailed.map(sw => (
                      <SwitchCard key={sw.serial} sw={sw} />
                    ))
                  ) : (
                    <div style={{ padding: '12px', color: '#64748b' }}>
                      No hay información detallada de puertos disponible
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      }

      case 'access_points': {
        const wirelessSummary = wirelessInsights?.summary || null;
        const wirelessDeviceSummaries = Array.isArray(wirelessInsights?.devices) ? wirelessInsights.devices : [];

        const enrichWireless = (serial) => {
          if (!serial) return null;
          if (wirelessDeviceSummaries.length === 0) return null;
          const normalized = serial.toString().toUpperCase();
          const compact = normalized.replace(/-/g, '');
          return wirelessDeviceSummaries.find((item) => {
            const entrySerial = (item.serial || item.deviceSerial || '').toString().toUpperCase();
            if (!entrySerial) return false;
            return entrySerial === normalized || entrySerial === compact;
          }) || null;
        };

        const accessPoints = (enrichedAPs || devices.filter((d) => d.model?.toLowerCase().startsWith('mr')))
          .map((ap) => {
            // Siempre intentar enriquecer con datos wireless del summary
            const fallbackWireless = enrichWireless(ap.serial);
            const baseWireless = ap.wireless || null;
            
            // Priorizar datos wireless del summary si tienen historial
            let wirelessData = null;
            if (fallbackWireless && (Array.isArray(fallbackWireless.history) && fallbackWireless.history.length > 0)) {
              wirelessData = fallbackWireless;
            } else if (baseWireless) {
              wirelessData = baseWireless;
            } else if (fallbackWireless) {
              wirelessData = { signalSummary: fallbackWireless };
            }
            
            return {
              ...ap,
              status: statusMap.get(ap.serial) || ap.status,
              wireless: wirelessData,
            };
          });

        if (!accessPoints.length) {
          return (
            <div style={{ padding: '12px', color: '#64748b' }}>
              No se encontraron Access Points en este predio.
            </div>
          );
        }

        // Badge de carga LLDP
        const lldpBadge = loadingLLDP && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#1e40af',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Actualizando velocidades LLDP...
          </div>
        );
        
  // Nota: comprobación de enrichedAPs (registro suprimido para consola)
        if (accessPoints.length > 0) {
          console.debug('Primer AP procesado:', accessPoints[0].name, accessPoints[0].serial);
          console.debug('Wireless data completo:', JSON.stringify(accessPoints[0].wireless, null, 2));
        }

        if (!accessPoints.length) {
          return (
            <div style={{ padding: '12px', color: '#64748b' }}>
              No se encontraron Access Points en este predio.
            </div>
          );
        }

        // Forzar vista de tabla siempre (sin tarjetas de wireless)
        const hasWireless = false; // Cambiado a false para siempre mostrar tabla
        // Mobile optimized list for APs
        if (isMobile) {
          const mobileAps = sortData(accessPoints, sortConfig.key, sortConfig.direction);
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>Wireless</h2>
                {lldpBadge}
              </div>
              <div className="mobile-device-list">
                {mobileAps.map((d) => {
                  const statusColor = getStatusColor(d.status);
                  const subline = d.serial || d.lanIp || d.connectedTo || '';

                  // Construir contenido seguro para tooltip (no pasar objetos crudos)
                  const apTooltip = d.tooltipInfo ? (
                    <div>
                      <div className="tooltip-title">{d.tooltipInfo.name}</div>
                      {d.tooltipInfo.model && (
                        <div className="tooltip-row"><span className="tooltip-label">Modelo</span><span className="tooltip-value">{d.tooltipInfo.model}</span></div>
                      )}
                      {d.tooltipInfo.serial && (
                        <div className="tooltip-row"><span className="tooltip-label">Serial</span><span className="tooltip-value">{d.tooltipInfo.serial}</span></div>
                      )}
                      {d.tooltipInfo.mac && (
                        <div className="tooltip-row"><span className="tooltip-label">MAC</span><span className="tooltip-value">{d.tooltipInfo.mac}</span></div>
                      )}
                      {d.tooltipInfo.firmware && (
                        <div className="tooltip-row"><span className="tooltip-label">Firmware</span><span className="tooltip-value">{d.tooltipInfo.firmware}</span></div>
                      )}
                      {d.tooltipInfo.lanIp && (
                        <div className="tooltip-row"><span className="tooltip-label">LAN IP</span><span className="tooltip-value">{d.tooltipInfo.lanIp}</span></div>
                      )}
                      {d.tooltipInfo.signalQuality != null && (
                        <div className="tooltip-row"><span className="tooltip-label">Calidad señal</span><span className="tooltip-value">{d.tooltipInfo.signalQuality}%</span></div>
                      )}
                      {!isMobile && d.tooltipInfo.clients != null && (
                        <div className="tooltip-row"><span className="tooltip-label">Clientes</span><span className="tooltip-value">{d.tooltipInfo.clients}</span></div>
                      )}
                      {!isMobile && d.tooltipInfo.microDrops > 0 && (
                        <div className="tooltip-row"><span className="tooltip-label">Microcortes</span><span className={`tooltip-badge error`}>{d.tooltipInfo.microDrops}</span></div>
                      )}
                      {d.tooltipInfo.connectedTo && d.tooltipInfo.connectedTo !== '-' && (
                        <div className="tooltip-row"><span className="tooltip-label">Conectado a</span><span className="tooltip-value">{d.tooltipInfo.connectedTo}</span></div>
                      )}
                      {d.tooltipInfo.wiredSpeed && (
                        <div className="tooltip-row"><span className="tooltip-label">Velocidad Ethernet</span><span className="tooltip-value">{d.tooltipInfo.wiredSpeed}</span></div>
                      )}
                    </div>
                  ) : null;

                  return (
                    <div key={d.serial || d.mac || d.name} className="mobile-device-item">
                      <Tooltip content={apTooltip} position="auto" modalOnMobile={true}>
                        <button type="button" className="mobile-device-button" style={{ display: 'flex', alignItems: 'center', width: '100%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                            <div className="mobile-device-icon"><WifiIcon /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || d.serial}</div>
                              <div className="mobile-device-subline">{subline}</div>
                            </div>
                            <div style={{ marginLeft: 8, flex: '0 0 auto' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: normalizeReachability(d.status) === 'connected' ? '#d1fae5' : '#fee2e2' }}>
                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: statusColor }} />
                              </span>
                            </div>
                          </div>
                        </button>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (!hasWireless) {
          return (
            <div>
              <h2 style={{ 
                margin: '0 0 12px 0', 
                color: '#1e293b', 
                fontSize: '20px', 
                fontWeight: '600',
                borderBottom: '2px solid #cbd5e1',
                paddingBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span>Wireless</span>
                  {lldpBadge}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => captureAndDownloadImage('Access Points')}
                    style={{
                      padding: '8px 16px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Descargar como JPG"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    JPG
                  </button>
                  <button
                    onClick={() => captureAndDownloadPDF('Access Points')}
                    style={{
                      padding: '8px 16px',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Descargar como PDF"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    PDF
                  </button>
                </div>
              </h2>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '12px', 
                marginBottom: '20px',
                padding: '14px',
                background: '#f1f5f9',
                borderRadius: '10px'
              }}>
                <SummaryChip label="Total APs" value={accessPoints.length} accent="#1f2937" />
                <SummaryChip 
                  label="Online" 
                  value={accessPoints.filter(ap => normalizeReachability(ap.status) === 'connected').length} 
                  accent="#059669" 
                />
                <SummaryChip 
                  label="Offline" 
                  value={accessPoints.filter(ap => normalizeReachability(ap.status) === 'disconnected').length} 
                  accent="#ef4444" 
                />
              </div>

              <div style={{ overflowX: 'visible', overflowY: 'visible', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <table className="modern-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <SortableHeader label="Status" sortKey="status" align="center" width="5%" />
                      <SortableHeader label="Name" sortKey="name" align="left" width="9%" />
                      <th style={{ textAlign: 'left', width: '18%' }}>Connectivity (UTC-3)</th>
                      <SortableHeader label="Serial number" sortKey="serial" align="left" width="11%" />
                      <SortableHeader label="Ethernet 1" sortKey="wiredSpeed" align="left" width="10%" />
                      <SortableHeader label="Ethernet 1 LLDP" sortKey="connectedTo" align="left" width="14%" />
                      <SortableHeader label="MAC address" sortKey="mac" align="left" width="13%" />
                      <th style={{ textAlign: 'left', width: '10%' }}>Local IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortData(accessPoints, sortConfig.key, sortConfig.direction).map((d) => {
                      const statusColor = getStatusColor(d.status);
                      const isOnline = normalizeReachability(d.status) === 'connected';
                      
                      // Construir tooltip para AP
                      const apTooltip = d.tooltipInfo ? (
                        <div>
                          <div className="tooltip-title">{d.tooltipInfo.name}</div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Modelo</span>
                            <span className="tooltip-value">{d.tooltipInfo.model}</span>
                          </div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Serial</span>
                            <span className="tooltip-value">{d.tooltipInfo.serial}</span>
                          </div>
                          {d.tooltipInfo.firmware && (
                            <div className="tooltip-row">
                              <span className="tooltip-label">Firmware</span>
                              <span className="tooltip-value">{d.tooltipInfo.firmware}</span>
                            </div>
                          )}
                          {d.tooltipInfo.lanIp && (
                            <div className="tooltip-row">
                              <span className="tooltip-label">LAN IP</span>
                              <span className="tooltip-value">{d.tooltipInfo.lanIp}</span>
                            </div>
                          )}
                          {d.tooltipInfo.signalQuality != null && (
                            <div className="tooltip-row">
                              <span className="tooltip-label">Calidad señal</span>
                              <span className="tooltip-value">{d.tooltipInfo.signalQuality}%</span>
                            </div>
                          )}
                          {d.tooltipInfo.clients != null && (
                            <div className="tooltip-row">
                              <span className="tooltip-label">Clientes</span>
                              <span className="tooltip-value">{d.tooltipInfo.clients}</span>
                            </div>
                          )}
                          {d.tooltipInfo.microDrops > 0 && (
                            <div className="tooltip-row">
                              <span className="tooltip-label">Microcortes</span>
                              <span className={`tooltip-badge error`}>{d.tooltipInfo.microDrops}</span>
                            </div>
                          )}
                          {d.tooltipInfo.connectedTo && d.tooltipInfo.connectedTo !== '-' && (
                            <div className="tooltip-row">
                              <span className="tooltip-label">Conectado a</span>
                              <span className="tooltip-value">{d.tooltipInfo.connectedTo}</span>
                            </div>
                          )}
                          {d.tooltipInfo.wiredSpeed && (
                            <div className="tooltip-row">
                              <span className="tooltip-label">Velocidad Ethernet</span>
                              <span className="tooltip-value">{d.tooltipInfo.wiredSpeed}</span>
                            </div>
                          )}
                        </div>
                      ) : null;
                      
                      return (
                        <tr key={d.serial}>
                          <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                            <span 
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: isOnline ? '#d1fae5' : '#fee2e2',
                              }}
                            >
                              <span style={{ 
                                width: '9px', 
                                height: '9px', 
                                borderRadius: '50%', 
                                background: statusColor 
                              }} />
                            </span>
                          </td>
                          <td style={{ textAlign: 'left', padding: '8px 10px' }}>
                            <Tooltip content={apTooltip} position="right">
                              <div style={{ fontWeight: '700', color: '#2563eb', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                                {d.name || d.serial}
                              </div>
                            </Tooltip>
                          </td>
                          <td style={{ textAlign: 'left', padding: '8px 10px' }}>
                            <ConnectivityBar ap={d} />
                          </td>
                          <td style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'monospace', fontSize: '13px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.serial}
                          </td>
                          <td style={{ textAlign: 'left', fontSize: '13px', color: '#1e293b', padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatWiredSpeed(d.wiredSpeed, enrichedAPs !== null)}
                          </td>
                          <td style={{ textAlign: 'left', fontSize: '13px', color: '#2563eb', fontWeight: '500', padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.connectedTo ? d.connectedTo.replace(/^.*?\s-\s/, '') : '-'}
                          </td>
                          <td style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: '12px', color: '#64748b', padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.mac || '-'}
                          </td>
                          <td style={{ textAlign: 'left', fontSize: '13px', color: '#1e293b', padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.lanIp || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        const totalMicroDrops = accessPoints.reduce((acc, ap) => acc + (ap.wireless?.microDrops ?? ap.wireless?.signalSummary?.microDrops ?? 0), 0);
        const totalMicroDuration = accessPoints.reduce((acc, ap) => acc + (ap.wireless?.microDurationSeconds ?? ap.wireless?.signalSummary?.microDurationSeconds ?? 0), 0);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ 
              margin: '0 0 20px 0', 
              color: '#1e293b', 
              fontSize: '20px', 
              fontWeight: '600',
              borderBottom: '2px solid #cbd5e1',
              paddingBottom: '12px'
            }}>
              Wireless
            </h2>
            {(wirelessSummary || accessPoints.length) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {wirelessSummary && (
                  <>
                    <SummaryChip label="Calidad media red" value={formatQualityScore(wirelessSummary.average)} accent="#2563eb" />
                    <SummaryChip label="Cobertura" value={formatCoverage(wirelessSummary.coverage)} accent="#0f766e" />
                  </>
                )}
                <SummaryChip label="AP monitoreados" value={accessPoints.length} accent="#1f2937" />
                <SummaryChip label="Microcortes 24h" value={`${totalMicroDrops} · ${formatDuration(totalMicroDuration)}`} accent="#f97316" />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
              {accessPoints.map((ap) => (
                <AccessPointCard key={ap.serial} ap={ap} isEnriched={enrichedAPs !== null} />
              ))}
            </div>
          </div>
        );
      }

      case 'appliance_status': {
        if (!applianceStatus.length) {
          return <div style={{ padding: '12px', color: '#57606a' }}>No se encontraron datos del appliance para este predio.</div>;
        }

        // Mobile compact list/cards for appliances
        if (isMobile) {
          return (
            <div>
              <h2 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>Appliance</h2>
              <div className="mobile-appliance-list">
                {applianceStatus.map((appliance) => {
                  const uplinks = Array.isArray(appliance.uplinks) ? appliance.uplinks : [];
                  const activeUplink = uplinks.find(u => normalizeReachability(u.statusNormalized || u.status) === 'connected') || uplinks[0] || {};
                  const statusNormalized = normalizeReachability(activeUplink.statusNormalized || activeUplink.status || appliance.device?.status);
                  const color = statusNormalized === 'connected' ? '#10b981' : statusNormalized === 'disconnected' ? '#ef4444' : '#f59e0b';

                  // Determine connected ports for this appliance (derived from topology or port list)
                  const connectedFromTopology = deriveConnectedPortsFromTopology(appliance.device?.serial, summaryData?.topology || null) || [];
                  // also check ports that have a carrier (enriched) if available
                  const portsList = Array.isArray(appliance.ports) ? appliance.ports : [];
                  const portsNums = portsList.map(p => parseInt(p.number, 10)).filter(Number.isFinite);
                  const connectedFromPorts = portsList.filter((p) => {
                    const norm = (p.statusNormalized || p.status || '').toString().toLowerCase();
                    return norm.includes('connected') || p.hasCarrier === true || (p.uplink && normalizeReachability(p.uplink.status) === 'connected');
                  }).map(p => parseInt(p.number, 10)).filter(Number.isFinite);

                  // Merge unique port numbers (topology-derived first)
                  const mergedPortsSet = new Set([...connectedFromTopology, ...connectedFromPorts]);
                  const mergedPorts = Array.from(mergedPortsSet).sort((a, b) => a - b);

                  // Determine unused ports (present in portsList but not in mergedPorts)
                  const unusedPorts = portsNums.filter(n => !mergedPortsSet.has(n)).sort((a,b)=>a-b);

                  // WAN interface badges
                  const uplinkIfaces = Array.isArray(appliance.uplinks) ? appliance.uplinks : [];
                  const wanBadges = uplinkIfaces.map((u) => {
                    const iface = (u.interface || u.name || '').toString();
                    const connected = normalizeReachability(u.statusNormalized || u.status) === 'connected';
                    return { iface, connected, ip: u.ip || u.publicIp || '' };
                  });

                  return (
                    <div key={appliance.device?.serial || appliance.device?.mac} className="mobile-appliance-card" role="button" onClick={() => setSection('appliance_status')}>
                      <div className="mobile-appliance-left">
                        <div className="mobile-appliance-icon"><ServerIcon /></div>
                      </div>
                      <div className="mobile-appliance-main">
                        <div className="mobile-appliance-title">{appliance.device?.model || appliance.device?.name}</div>
                        <div className="mobile-appliance-sub">{appliance.device?.name || appliance.device?.serial}</div>
                        <div className="mobile-appliance-meta">
                          {appliance.device?.mac && <span className="meta-item">MAC: <strong>{appliance.device.mac}</strong></span>}
                        </div>

                        {/* Ports: show full ordered sequence; highlight those in use */}
                        <div className="mobile-appliance-ports">
                          {(() => {
                            const allPortsSorted = Array.from(new Set([...portsNums])).sort((a, b) => a - b);
                            const maxShow = 16;
                            return (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                {allPortsSorted.length > 0 ? allPortsSorted.slice(0, maxShow).map((p) => (
                                  <span key={`p-${p}`} className={`ap-port-badge ${mergedPortsSet.has(p) ? 'used' : 'unused'}`}>P{p}</span>
                                )) : <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>—</div>}
                                {allPortsSorted.length > maxShow && <div style={{ fontSize: 12, color: '#64748b' }}>+{allPortsSorted.length - maxShow}</div>}
                              </div>
                            );
                          })()}
                        </div>

                        {/* WAN badges + Estado (Estado refiere a la WAN activa) */}
                        {wanBadges.length > 0 && (
                          <div className="mobile-appliance-wan">
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              {wanBadges.map((wb, idx) => (
                                <div key={`wan-${idx}`} className={`ap-wan-badge ${wb.connected ? 'active' : 'inactive'}`} title={wb.ip || ''}>
                                  {wb.iface || `wan${idx+1}`}
                                  {wb.ip ? <span style={{ marginLeft: 6, fontWeight: 600, fontSize: 12 }}>{wb.ip}</span> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Estado moved below everything and left-aligned (refers to active WAN) */}
                        <div className="mobile-appliance-status-row">
                          <div className="mobile-appliance-status-label">Estado:</div>
                          <span className="mobile-appliance-status" style={{ background: color, color: '#fff', padding: '6px 10px', borderRadius: 999, fontWeight: 700 }}>{statusNormalized === 'connected' ? 'Connected' : statusNormalized}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ 
              margin: '0 0 20px 0', 
              color: '#1e293b', 
              fontSize: '20px', 
              fontWeight: '600',
              borderBottom: '2px solid #cbd5e1',
              paddingBottom: '12px'
            }}>
              Appliance status
            </h2>

            {applianceStatus.map((appliance) => {
              const uplinks = Array.isArray(appliance.uplinks) ? appliance.uplinks : [];
              
              // Encontrar el uplink activo (wan1 o wan2)
              const activeUplink = uplinks.find(uplink => 
                normalizeReachability(uplink.statusNormalized || uplink.status) === 'connected'
              ) || uplinks[0]; // Si ninguno está conectado, mostrar el primero

              if (!activeUplink) return null;

              const statusNormalized = normalizeReachability(activeUplink.statusNormalized || activeUplink.status || activeUplink.reachability);
              const color = statusNormalized === 'connected' ? '#10b981' : statusNormalized === 'disconnected' ? '#ef4444' : '#f59e0b';
              
              const dnsLabel = (() => {
                if (Array.isArray(activeUplink.dns)) return activeUplink.dns.join(', ');
                const parts = [activeUplink.dns, activeUplink.dnsSecondary].filter(Boolean);
                return parts.length ? parts.join(' · ') : '-';
              })();

              // Buscar el historial del uplink activo
              const findHistorySeries = (iface) => {
                if (!iface || !Array.isArray(appliance.uplinkHistory)) return null;
                const normalized = iface.toString().toLowerCase();
                return appliance.uplinkHistory.find((series) => (series.interface || '').toLowerCase() === normalized);
              };

              const historySeries = findHistorySeries(activeUplink.interface);

              return (
                <div key={appliance.device.serial} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '20px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Header del appliance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2em', color: '#1e293b' }}>{appliance.device.name || appliance.device.mac}</h3>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                        <span>LAN IP: <b>{appliance.device.lanIp || '-'}</b></span>
                      </div>
                    </div>
                    <span style={{ 
                      background: color === '#10b981' ? '#d1fae5' : color === '#ef4444' ? '#fee2e2' : '#fef3c7',
                      color: color,
                      padding: '6px 16px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600
                    }}>
                      {appliance.device.status}
                    </span>
                  </div>

                  {/* Contenido principal: Puertos y WAN lado a lado */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start' }}>
                    {/* Matriz de puertos */}
                    <div>
                      {(() => {
                        const connectedOverrides = deriveConnectedPortsFromTopology(appliance.device?.serial, topology);
                        const enrichedPorts = enrichPortsWithConnections(appliance.ports, appliance.device?.serial, topology);
                        return (
                          <AppliancePortsMatrix
                            ports={enrichedPorts}
                            model={appliance.device?.model}
                            uplinks={appliance.uplinks}
                            connectedOverrides={connectedOverrides}
                          />
                        );
                      })()}
                    </div>

                    {/* Card del WAN activo - Optimizado */}
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 14, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10, height: 'fit-content', maxWidth: '420px' }}>
                      {/* Título WAN Interface */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{activeUplink.interface}</h4>
                        <span style={{ 
                          background: color, 
                          color: '#fff', 
                          padding: '3px 10px', 
                          borderRadius: 999, 
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {statusNormalized === 'connected' ? 'active' : 'not connected'}
                        </span>
                      </div>
                      
                      {/* Información del dispositivo */}
                      <div style={{ padding: '10px', background: '#ffffff', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dispositivo</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>Modelo:</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{appliance.device.model || '-'}</span>
                          
                          <span style={{ color: '#64748b' }}>Serial:</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{appliance.device.serial || '-'}</span>
                          
                          <span style={{ color: '#64748b' }}>MAC:</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{appliance.device.mac || '-'}</span>
                        </div>
                      </div>

                      {/* Información WAN - Solo campos con datos */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 10px', fontSize: 12 }}>
                        {activeUplink.ip && (
                          <>
                            <span style={{ color: '#64748b' }}>IP:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{activeUplink.ip}</span>
                          </>
                        )}
                        
                        {activeUplink.publicIp && (
                          <>
                            <span style={{ color: '#64748b' }}>Public IP:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{activeUplink.publicIp}</span>
                          </>
                        )}
                        
                        {activeUplink.gateway && (
                          <>
                            <span style={{ color: '#64748b' }}>Gateway:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{activeUplink.gateway}</span>
                          </>
                        )}
                        
                        {dnsLabel && dnsLabel !== '-' && (
                          <>
                            <span style={{ color: '#64748b' }}>DNS:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{dnsLabel}</span>
                          </>
                        )}
                        
                        {activeUplink.loss != null && (
                          <>
                            <span style={{ color: '#64748b' }}>Loss:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{activeUplink.loss}%</span>
                          </>
                        )}
                        
                        {activeUplink.latency != null && (
                          <>
                            <span style={{ color: '#64748b' }}>Latency:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{activeUplink.latency} ms</span>
                          </>
                        )}
                        
                        {activeUplink.jitter != null && (
                          <>
                            <span style={{ color: '#64748b' }}>Jitter:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{activeUplink.jitter} ms</span>
                          </>
                        )}
                        
                        {activeUplink.connectionType && (
                          <>
                            <span style={{ color: '#64748b' }}>Tipo:</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{activeUplink.connectionType}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Graficas historicas del appliance - Connectivity y Client usage */}
            <Suspense fallback={<LoadingOverlay isLoading={true} message="Cargando gráficos históricos..." />}>
              <ApplianceHistoricalCharts 
                networkId={typeof selectedNetwork === 'object' ? selectedNetwork?.id : selectedNetwork}
              />
            </Suspense>
          </div>
        );
      }

      default:
        return <div>Selecciona una sección.</div>;
    }
  };

  return (
    <div style={{ width: '100vw', overflow: 'visible' }}>
  <TopBar onSearch={search} onLogout={onLogout} onSelectSection={setSection} sections={availableSections} selectedSection={section} selectedNetwork={selectedNetwork} />
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'auto minmax(0, 1fr)', 
        gap: 16, 
        padding: '16px', 
        alignItems: 'start', 
        background: '#f1f5f9', 
        minHeight: 'calc(100vh - 42px)',
        maxWidth: '100vw',
        boxSizing: 'border-box'
      }}>
        <div className="dashboard-sidebar">
          <Sidebar section={section} setSection={setSection} sections={availableSections} selectedNetwork={selectedNetwork} />
        </div>
        <main className="dashboard-container" style={{ 
          width: '100%', 
          maxWidth: '100%',
          overflow: 'visible',
          boxSizing: 'border-box'
        }}>
          {isMobile && (
            <div className="mobile-section-tiles-wrapper">
              <div className="mobile-section-tiles">
                {availableSections.map((item) => {
                  const IconComp = item.IconComponent || TopologyIcon;
                  // derive some counts for specific tiles
                  const total = mobileCounts[item.k] ?? 0;
                  let online = 0;
                  let offline = 0;
                  if (item.k === 'access_points') {
                    const aps = (enrichedAPs && enrichedAPs.length) ? enrichedAPs : (summaryData?.devices || []).filter(d => (d.model || '').toLowerCase().startsWith('mr'));
                    online = aps.filter(a => normalizeReachability(a.status) === 'connected').length;
                    offline = aps.filter(a => normalizeReachability(a.status) === 'disconnected').length;
                  } else if (item.k === 'switches') {
                    const sws = (summaryData?.devices || []).filter(d => (d.model || '').toLowerCase().startsWith('ms'));
                    online = sws.filter(s => normalizeReachability(s.status || s.statusNormalized || s.connectionStatus || 'unknown') === 'connected').length;
                    offline = sws.filter(s => normalizeReachability(s.status || s.statusNormalized || s.connectionStatus || 'unknown') === 'disconnected').length;
                  } else if (item.k === 'appliance_status') {
                    const apps = summaryData?.applianceStatus || [];
                    online = apps.filter(a => {
                      const uplinks = Array.isArray(a.uplinks) ? a.uplinks : [];
                      return uplinks.some(u => normalizeReachability(u.status || u.statusNormalized) === 'connected');
                    }).length;
                    offline = apps.length - online;
                  } else if (item.k === 'topology') {
                    online = mobileCounts.topology;
                    offline = 0;
                  }

                  return (
                    <div key={item.k} className="mobile-section-tile" role="button" onClick={() => setSection(item.k)} tabIndex={0}>
                      <div className="mobile-section-tile-row">
                        <div className="mobile-section-tile-icon"><IconComp /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                          <div className="mobile-section-tile-title">{item.t}</div>
                          <div className="mobile-section-tile-count">{total} {total === 1 ? 'device' : 'devices'}</div>
                        </div>
                      </div>

                      {/* small summary row */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, width: '100%', justifyContent: 'space-between' }}>
                        <div className="tile-stat">
                          <div className="tile-stat-value">{online}</div>
                          <div className="tile-stat-label">Online</div>
                        </div>
                        <div className="tile-stat">
                          <div className="tile-stat-value">{offline}</div>
                          <div className="tile-stat-label">Offline</div>
                        </div>
                        <div className="tile-stat">
                          <div className="tile-stat-value">{total ? total : '-'}</div>
                          <div className="tile-stat-label">{item.k === 'access_points' ? 'Total APs' : item.t}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {error && <div style={{ color: '#e74c3c', marginBottom: 10 }}>{error}</div>}
          
          <div style={{ 
            overflowX: section === 'topology' ? 'auto' : 'visible',
            overflowY: 'visible',
            width: '100%', 
            maxWidth: '100%',
            marginLeft: section === 'topology' ? '-40px' : '0',
            marginRight: section === 'topology' ? '-40px' : '0',
            paddingLeft: section === 'topology' ? '20px' : '0',
            paddingRight: section === 'topology' ? '20px' : '0'
          }}>
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}

