/**
 * Componentes relacionados con Switches
 * Estos componentes serán gradualmente refactorizados para mayor modularidad
 */

import Tooltip from '../Tooltip';
import { normalizeReachability, getStatusColor, resolvePortColor } from '../../utils/networkUtils';
import { SummaryChip } from './DashboardHelpers';
import { SortableHeader } from './SortableHeader';
import { SwitchIcon } from './DashboardIcons';
import '../AppliancePorts.css';

/**
 * Grid de puertos de un switch - Estilo Meraki
 */
export const SwitchPortsGrid = ({ ports = [] }) => {
  if (!ports.length) return <div style={{ fontSize: 13, color: '#64748b' }}>Sin información de puertos disponible.</div>;
  
  // Separar puertos normales de uplinks (puertos > 24 típicamente son SFP)
  const regularPorts = ports.filter(p => {
    const num = parseInt(p.portId);
    return num <= 24;
  });
  
  const uplinkPorts = ports.filter(p => {
    const num = parseInt(p.portId);
    return num > 24;
  });
  
  const renderPort = (port, isUplink = false) => {
    const isConnected = normalizeReachability(port.statusNormalized || port.status) === 'connected';
    const isDisabled = port.enabled === false;
    
    // Determinar clase del puerto
    let portClass = 'NodePort rj45';
    if (isDisabled) {
      portClass += ' disabled';
    } else if (isConnected) {
      portClass += ' has_carrier';
    } else {
      portClass += ' passthrough';
    }
    
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
        {port.poeEnabled && (
          <div className="tooltip-row">
            <span className="tooltip-label">PoE</span>
            <span className="tooltip-value">Habilitado</span>
          </div>
        )}
        {port.isUplink && (
          <div className="tooltip-row">
            <span className="tooltip-label">Función</span>
            <span className="tooltip-value">Puerto Uplink</span>
          </div>
        )}
      </div>
    );
    
    // Tamaño del SVG
    const svgWidth = isUplink ? '36px' : '30px';
    const svgHeight = isUplink ? '30px' : '25px';
    
    return (
      <Tooltip key={port.portId} content={portTooltip} position="auto">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '4px'
        }}>
          {/* Número arriba */}
          <div style={{ 
            fontSize: '10px', 
            color: '#1f2937',
            fontWeight: '600'
          }}>
            {port.portId}
            {port.poeEnabled && isConnected && (
              <span style={{ marginLeft: '2px', color: '#f59e0b' }}>⚡</span>
            )}
          </div>
          
          {/* Puerto RJ45 usando SVG como en AppliancePortsMatrix */}
          <svg
            viewBox="0 0 30 25"
            preserveAspectRatio="none"
            className={portClass}
            style={{ 
              width: svgWidth, 
              height: svgHeight,
              cursor: 'pointer'
            }}
          >
            <g>
              <polygon points="5,9 9,9 9,6 12,6 12,3 18,3 18,6 21,6 21,9 25,9 25,21 5,21" />
            </g>
          </svg>
        </div>
      </Tooltip>
    );
  };
  
  return (
    <div className="PortMatrixWrapper" style={{ display: 'inline-block' }}>
      <div className="NodePortTable" style={{ display: 'inline-block' }}>
        {/* Puertos regulares (1-24) */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          maxWidth: '520px'
        }}>
          {regularPorts.map(port => renderPort(port, false))}
        </div>
        
        {/* Puertos uplink/SFP si existen */}
        {uplinkPorts.length > 0 && (
          <div style={{ 
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #cbd5e1'
          }}>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px', fontWeight: '600' }}>Uplinks</div>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {uplinkPorts.map(port => renderPort(port, true))}
            </div>
          </div>
        )}
      </div>
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
              <span>→ {uplinkInfo}</span>
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
