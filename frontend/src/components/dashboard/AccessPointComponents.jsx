import { normalizeReachability, getStatusColor } from '../../utils/networkUtils';
import { formatDuration } from '../../utils/formatters';
import Tooltip from '../Tooltip';

/**
 * Timeline de conectividad - muestra segmentos de tiempo por estado
 */
export const ConnectivityTimeline = ({ series }) => {
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

/**
 * Sparkline de calidad de señal con umbral
 */
export const SignalQualitySparkline = ({ samples = [], threshold = 25 }) => {
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

/**
 * Barra de conectividad tipo Meraki Dashboard
 */
export const ConnectivityBar = ({ ap, device }) => {
  const targetDevice = device || ap;
  const wireless = targetDevice.wireless || {};
  const history = Array.isArray(wireless.history) ? wireless.history : [];
  const isOnline = normalizeReachability(targetDevice.status) === 'connected';
  
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
    const hasFailures = sample.failures > 0;
    
    if (hasFailures || quality === 0) {
      return { color: '#ef4444', label: `Microcorte${hasFailures ? ` (${sample.failures} fallos)` : ''}` };
    } else if (quality < 0) {
      return { color: '#cbd5e1', label: 'Sin señal' };
    } else if (quality <= signalThreshold) {
      return { color: '#f59e0b', label: 'Señal débil' };
    } else {
      return { color: '#45991f', label: 'Conectado' };
    }
  });

  const totalSegments = segments.length;

  return (
    <div style={{ display: 'flex', height: '8px', borderRadius: '2px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
      {segments.map((segment, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            background: segment.color,
            transition: 'all 0.3s ease',
          }}
          title={segment.label}
        />
      ))}
    </div>
  );
};

/**
 * Tarjeta de Access Point con métricas wireless
 */
export const AccessPointCard = ({ ap, signalThreshold = 25 }) => {
  const statusColor = getStatusColor(ap.status);
  const isOnline = normalizeReachability(ap.status) === 'connected';
  const wireless = ap.wireless || {};
  const history = Array.isArray(wireless.history) ? wireless.history : [];
  const signalSummary = wireless.signalSummary || {};

  // Métricas de microcortes
  const microDrops = signalSummary.totalFailures || 0;
  const microDuration = signalSummary.totalFailureDuration || 0;

  // Tooltip para el AP
  const apTooltip = ap.tooltipInfo ? (
    <div>
      <div className="tooltip-title">{ap.tooltipInfo.name}</div>
      {ap.tooltipInfo.model && (
        <div className="tooltip-row">
          <span className="tooltip-label">Modelo</span>
          <span className="tooltip-value">{ap.tooltipInfo.model}</span>
        </div>
      )}
      {ap.tooltipInfo.serial && (
        <div className="tooltip-row">
          <span className="tooltip-label">Serial</span>
          <span className="tooltip-value">{ap.tooltipInfo.serial}</span>
        </div>
      )}
      {ap.tooltipInfo.mac && (
        <div className="tooltip-row">
          <span className="tooltip-label">MAC</span>
          <span className="tooltip-value">{ap.tooltipInfo.mac}</span>
        </div>
      )}
      {ap.tooltipInfo.firmware && (
        <div className="tooltip-row">
          <span className="tooltip-label">Firmware</span>
          <span className="tooltip-value">{ap.tooltipInfo.firmware}</span>
        </div>
      )}
      {ap.tooltipInfo.lanIp && (
        <div className="tooltip-row">
          <span className="tooltip-label">LAN IP</span>
          <span className="tooltip-value">{ap.tooltipInfo.lanIp}</span>
        </div>
      )}
      {ap.tooltipInfo.connectedTo && ap.tooltipInfo.connectedTo !== '-' && (
        <div className="tooltip-row">
          <span className="tooltip-label">Conectado a</span>
          <span className="tooltip-value">{ap.tooltipInfo.connectedTo}</span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="modern-card">
      <div className="modern-card-header">
        <div>
          <Tooltip content={apTooltip || "Access Point"} position="auto">
            <h3 className="modern-card-title" style={{ cursor: 'pointer' }}>{ap.name || ap.serial}</h3>
          </Tooltip>
          <p className="modern-card-subtitle">
            {ap.model} · {ap.serial}
          </p>
          {ap.lanIp && (
            <p className="modern-card-subtitle" style={{ marginTop: '2px' }}>
              IP: {ap.lanIp}
            </p>
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
          {ap.status}
        </span>
      </div>

      {/* Métricas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px', 
        marginBottom: '18px',
        padding: '14px',
        background: '#f1f5f9',
        borderRadius: '10px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Microcortes
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: microDrops > 0 ? '#ef4444' : '#059669', marginTop: '2px' }}>
            {microDrops}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Duración
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>
            {formatDuration(microDuration)}
          </div>
        </div>
      </div>

      {/* Barra de conectividad */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: '600', 
          color: '#475569', 
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Conectividad 24h
        </div>
        <ConnectivityBar ap={ap} />
      </div>

      {/* Sparkline de calidad de señal */}
      {history.length > 1 && (
        <div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#475569', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Calidad de Señal
          </div>
          <SignalQualitySparkline samples={history} threshold={signalThreshold} />
        </div>
      )}
    </div>
  );
};
