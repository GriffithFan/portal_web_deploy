import { useState } from 'react';
import { SwitchCard, SwitchesMobileList } from './SwitchComponents';
import { SummaryChip } from './DashboardHelpers';
import { SortableHeader } from './SortableHeader';
import { normalizeReachability, getStatusColor } from '../../utils/networkUtils';
import Tooltip from '../Tooltip';
import { SwitchIcon } from './DashboardIcons';

export default function SwitchesSection({
  devices,
  switchesDetailed,
  switchPorts,
  switchesOverview,
  statusMap,
  sortData,
  sortConfig,
  handleSort,
  isMobile
}) {
  const [switchesTab, setSwitchesTab] = useState('list');

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
    return <SwitchesMobileList switches={switchesData} sortData={sortData} sortConfig={sortConfig} />;
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
                accent="#22c55e" 
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
                  <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} align="center" width="8%" />
                  <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} align="left" width="18%" />
                  <SortableHeader label="Model" sortKey="model" sortConfig={sortConfig} onSort={handleSort} align="left" width="12%" />
                  <SortableHeader label="Serial" sortKey="serial" sortConfig={sortConfig} onSort={handleSort} align="left" width="15%" />
                  <th style={{ textAlign: 'left', width: '22%' }}>Connectivity (UTC-3)</th>
                  <SortableHeader label="MAC address" sortKey="mac" sortConfig={sortConfig} onSort={handleSort} align="left" width="15%" />
                  <SortableHeader label="LAN IP" sortKey="lanIp" sortConfig={sortConfig} onSort={handleSort} align="left" width="10%" />
                </tr>
              </thead>
              <tbody>
                {sortData(switchesData, sortConfig.key, sortConfig.direction).map((sw) => {
                  const statusColor = getStatusColor(sw.status);
                  const statusNormalized = normalizeReachability(sw.status);
                  
                  // Construir tooltip para la tabla
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
                    <tr key={sw.serial} style={{ overflow: 'visible' }}>
                      <td style={{ textAlign: 'center' }}>
                        <Tooltip content={switchTooltip || "Switch"} position="auto">
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: '26px', 
                            height: '26px', 
                            borderRadius: '50%', 
                            background: statusNormalized === 'connected' ? '#d1fae5' : statusNormalized === 'warning' ? '#fef3c7' : '#fee2e2',
                            cursor: 'pointer'
                          }}>
                            <span style={{ 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '50%', 
                              background: statusColor 
                            }} />
                          </span>
                        </Tooltip>
                      </td>
                      <td style={{ fontWeight: '600', color: '#2563eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px' }}>
                        {sw.name || sw.serial}
                      </td>
                      <td>{sw.model || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '13px', color: '#64748b' }}>{sw.serial}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div>
                            {sw.connectedTo ? (
                              <div style={{ color: '#1e293b', fontWeight: '500', fontSize: '13px' }}>
                                ↑ {sw.connectedTo}
                              </div>
                            ) : (
                              <div style={{ color: '#94a3b8', fontSize: '13px' }}>Sin info uplink</div>
                            )}
                            {sw.lastReportedAt && (
                              <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                                {new Date(sw.lastReportedAt).toLocaleString('es-AR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                  timeZone: 'America/Argentina/Buenos_Aires'
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>{sw.mac || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '13px', color: '#475569', fontWeight: '500' }}>{sw.lanIp || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div>
          {switchesDetailed && switchesDetailed.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 18 }}>
              {sortData(switchesDetailed, sortConfig.key, sortConfig.direction).map((sw) => (
                <SwitchCard key={sw.serial} sw={sw} />
              ))}
            </div>
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#64748b', 
              background: '#f8fafc', 
              borderRadius: '8px',
              border: '1px dashed #cbd5e1'
            }}>
              No hay información detallada de puertos disponible
            </div>
          )}
        </div>
      )}
    </div>
  );
}
