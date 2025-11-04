import { normalizeReachability } from '../../utils/networkUtils';
import { resolvePortColor } from '../../utils/networkUtils';
import { formatSpeedLabel, summarizeUsage, getPortAlias, getPortStatusLabel } from '../../utils/formatters';
import { groupPortsByRole } from '../../utils/applianceUtils';

/**
 * Resumen de puertos del Appliance
 */
export const AppliancePortsSummary = ({ ports = [], summary }) => {
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

/**
 * Grid de puertos del Appliance
 */
export const AppliancePortGrid = ({ ports = [] }) => {
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
              const bgColor = isInUse ? '#fff' : '#f8fafc';

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
                    <div>Uso: <strong>{usageLabel.recv} ↓ / {usageLabel.sent} ↑</strong></div>
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
