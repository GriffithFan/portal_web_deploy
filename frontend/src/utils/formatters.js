/**
 * Formatea un valor métrico agregando la unidad apropiada
 */
export const formatMetric = (value) => {
  if (value == null || value === '') return '-';
  if (typeof value === 'string') return value;
  return String(value);
};

/**
 * Formatea una fecha/hora
 */
export const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
};

/**
 * Formatea una lista de valores separados por coma
 */
export const formatList = (value) => {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return value;
  return String(value || '-');
};

/**
 * Formatea una duración en segundos a formato legible
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
};

/**
 * Formatea un valor en Kbps a formato legible
 */
export const formatKbpsValue = (value) => {
  if (value == null || value === '') return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  if (num >= 1000) return `${(num / 1000).toFixed(1)} Mbps`;
  return `${num.toFixed(1)} Kbps`;
};

/**
 * Resume el uso de un puerto (recv/sent)
 */
export const summarizeUsage = (port) => {
  if (!port) return { recv: '-', sent: '-' };
  const recv = port.usageInKb?.recv != null ? formatKbpsValue(port.usageInKb.recv) : '-';
  const sent = port.usageInKb?.sent != null ? formatKbpsValue(port.usageInKb.sent) : '-';
  return { recv, sent };
};

/**
 * Obtiene el alias de un puerto
 */
export const getPortAlias = (port) => {
  if (!port) return '-';
  return port.alias || port.name || `Puerto ${port.number || port.portId || '?'}`;
};

/**
 * Obtiene la etiqueta de estado de un puerto
 */
export const getPortStatusLabel = (port) => {
  if (!port) return 'Unknown';
  return port.statusNormalized || port.status || 'Unknown';
};

/**
 * Formatea la etiqueta de velocidad de un puerto
 */
export const formatSpeedLabel = (port) => {
  if (!port) return '-';
  if (port.speed) return port.speed;
  if (port.wiredSpeed) return formatWiredSpeed(port.wiredSpeed);
  return '-';
};

/**
 * Formatea la velocidad cableada (Ethernet)
 */
export const formatWiredSpeed = (speedString) => {
  if (!speedString) return '-';
  const str = String(speedString).toLowerCase();
  
  // Patrones comunes: "1 Gbps", "100 Mbps", etc.
  const match = str.match(/(\d+)\s*(gbps|mbps|kbps)/i);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    
    if (unit === 'gbps') {
      return value >= 1 ? `${value} Gbps` : `${value * 1000} Mbps`;
    } else if (unit === 'mbps') {
      return value >= 1000 ? `${value / 1000} Gbps` : `${value} Mbps`;
    } else if (unit === 'kbps') {
      return value >= 1000 ? `${value / 1000} Mbps` : `${value} Kbps`;
    }
  }
  
  // Si no coincide con un patrón conocido, devolver tal cual
  return speedString;
};

/**
 * Formatea un score de calidad (0-100)
 */
export const formatQualityScore = (value) => {
  if (value == null) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return `${num.toFixed(0)}%`;
};

/**
 * Formatea un porcentaje de cobertura
 */
export const formatCoverage = (value) => {
  if (value == null) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return `${num.toFixed(1)}%`;
};

/**
 * Verifica si un valor parece un número de serie
 */
export const looksLikeSerial = (value) => {
  if (!value) return false;
  const str = String(value).toUpperCase();
  // Los seriales de Meraki suelen tener formato: QXXX-XXXX-XXXX
  return /^Q[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(str) || /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(str);
};
