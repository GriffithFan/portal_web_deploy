/**
 * Componentes auxiliares reutilizables para el Dashboard
 */

/**
 * Chip de resumen con label y valor
 */
export const SummaryChip = ({ label, value, accent = '#1f2937' }) => (
  <div style={{ 
    padding: '8px 14px', 
    borderRadius: 8, 
    background: '#f1f5f9', 
    border: '1px solid #cbd5e1', 
    minWidth: 120 
  }}>
    <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, color: accent }}>{value}</div>
  </div>
);
