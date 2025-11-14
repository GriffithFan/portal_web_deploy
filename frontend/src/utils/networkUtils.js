/**
 * Normaliza valores de reachability/status de dispositivos
 * @param {*} value - Valor a normalizar
 * @param {string} fallback - Valor por defecto
 * @returns {string} Estado normalizado
 */
export const normalizeReachability = (value, fallback = 'unknown') => {
  if (!value) return fallback;
  const normalized = value.toString().trim().toLowerCase();
  // Estado crítico (rojo)
  if (/(not\s*connected|disconnected|offline|down|failed|inactive|unplugged)/.test(normalized)) return 'disconnected';
  // Estado intermedio (amarillo)
  if (/(alerting|warning|degraded|issues?|problem|unstable|limited|partial)/.test(normalized)) return 'warning';
  // Estado OK (verde)
  if (/(connected|online|up|active|ready|reachable|operational)/.test(normalized)) return 'connected';
  if (/disabled/.test(normalized)) return 'disabled';
  return normalized || fallback;
};

/**
 * Obtiene el color según el estado
 * @param {string} value - Estado del dispositivo
 * @returns {string} Color hexadecimal
 */
export const getStatusColor = (value) => {
  const normalized = normalizeReachability(value);
  if (normalized === 'connected') return '#22c55e'; // verde appliance
  if (normalized === 'warning') return '#f59e0b';   // amarillo
  if (normalized === 'disconnected') return '#ef4444'; // rojo
  if (normalized === 'disabled') return '#94a3b8';
  return '#6366f1';
};

/**
 * Resuelve el color de un puerto basado en su estado
 * @param {Object} port - Objeto del puerto
 * @returns {string} Color hexadecimal
 */
export const resolvePortColor = (port) => {
  if (!port.enabled && port.enabled !== undefined) return '#94a3b8';
  const normalized = normalizeReachability(port.statusNormalized || port.status);
  if (normalized === 'connected') return '#047857'; // verde
  if (normalized === 'warning') return '#f59e0b';   // amarillo
  if (normalized === 'disconnected') return '#ef4444'; // rojo
  if (normalized === 'disabled') return '#94a3b8';
  return '#60a5fa';
};

/**
 * Determina si un valor parece un número de serie
 * @param {*} value - Valor a verificar
 * @returns {boolean}
 */
export const looksLikeSerial = (value) => {
  if (!value) return false;
  const text = value.toString().trim();
  if (!text) return false;
  const pattern = /^[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){2,}$/i;
  if (pattern.test(text)) return true;
  const compact = text.replace(/[^a-z0-9]/gi, '');
  return compact.length >= 10 && /[a-z]/i.test(compact) && /\d/.test(compact);
};
