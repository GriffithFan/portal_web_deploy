/**
 * Componentes relacionados con Switches
 * Estos componentes serán gradualmente refactorizados para mayor modularidad
 */

import Tooltip from '../Tooltip';
import { normalizeReachability, getStatusColor, resolvePortColor } from '../../utils/networkUtils';
import { SummaryChip } from './DashboardHelpers';
import { SortableHeader } from './SortableHeader';
import { SwitchIcon } from './DashboardIcons';

/**
 * Grid de puertos de un switch
 */
export const SwitchPortsGrid = ({ ports = [] }) => {
  if (!ports.length) return <div style={{ fontSize: 13, color: '#64748b' }}>Sin información de puertos disponible.</div>;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8, overflow: 'visible' }}>
      {ports.map((port) => {
        const color = resolvePortColor(port);
        const label = port.status || port.statusNormalized || 'unknown';
        const isConnected = normalizeReachability(port.statusNormalized || port.status) === 'connected';
        const bgColor = isConnected ? '#a7f3d0' : '#fff';
        
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

/**
 * Card de switch con detalles y puertos
 */
export const SwitchCard = ({ sw }) => {
  const statusNormalized = normalizeReachability(sw.status);
  const statusColor = getStatusColor(sw.status);
  const portsToShow = Array.isArray(sw.ports) ? sw.ports : [];
  const uplinkInfo = sw.connectedTo || null;

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
              <span style={{ fontSize: '14px' }}>↑</span>
              <span>&#8594; {uplinkInfo}</span>
            </div>
          )}
        </div>
        <span 
          className={`status-badge ${statusNormalized}`}
          style={{ 
            background: statusNormalized === 'connected' ? '#d1fae5' : statusNormalized === 'warning' ? '#fef9c3' : '#fee2e2',
            color: statusColor 
          }}
        >
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: statusColor 
          }} />
          {statusNormalized === 'warning' ? 'warning' : (sw.status || 'unknown')}
        </span>
      </div>

      {/* Puertos */}
      <div className="modern-card-content">
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
          Puertos ({portsToShow.length})
        </h4>
        <SwitchPortsGrid ports={portsToShow} />
      </div>
    </div>
  );
};

/**
 * Lista móvil de switches
 */
export const SwitchesMobileList = ({ switches, sortData, sortConfig }) => {
  return (
    <div>
      <h2 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>Switches</h2>
      <div className="mobile-device-list">
        {sortData(switches).map((sw) => {
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
};
