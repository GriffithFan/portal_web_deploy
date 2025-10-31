import { useState } from 'react';

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

const defaultSections = [
  { k: 'topology', t: 'Topology', IconComponent: TopologyIcon },
  { k: 'switches', t: 'Switches', IconComponent: SwitchIcon },
  { k: 'access_points', t: 'Access Points', IconComponent: WifiIcon },
  { k: 'appliance_status', t: 'Appliance Status', IconComponent: ServerIcon }
];

export default function Sidebar({ section, setSection, sections, selectedNetwork }) {
  const [collapsed, setCollapsed] = useState(false);
  const items = Array.isArray(sections) && sections.length ? sections : defaultSections;
  
  return (
    <div className={"app-sidebar" + (collapsed ? ' collapsed' : '')}>
      {/* Header con Network info y botón de colapsar */}
      <div className="sidebar-header">
        {/* Network info */}
        {!collapsed && selectedNetwork && (
          <div style={{ flex: 1, marginRight: '8px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px'
            }}>
              Predio
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: '700',
              color: '#1e293b'
            }}>
              {/* Mostrar nombre del predio si existe, si no mostrar predio_code o id */}
              {selectedNetwork.name || selectedNetwork.predio_code || selectedNetwork.predioCode || selectedNetwork.id}
            </div>
            {selectedNetwork.name && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{selectedNetwork.id}</div>
            )}
          </div>
        )}
        
        {/* Botón para colapsar/expandir */}
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#475569" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="toggle-icon"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
      
      {/* Items del menú */}
      <div className="sidebar-items">
        {items.map(s => {
          const isActive = section === s.k;
          const Icon = s.IconComponent;
          return (
            <button 
              key={s.k} 
              type="button"
              onClick={() => setSection(s.k)}
              title={collapsed ? s.t : ''}
              className={"sidebar-item" + (isActive ? ' active' : '') + (collapsed ? ' collapsed' : '')}
            >
              <span style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '20px',
                minHeight: '20px',
                transition: 'color 0.2s ease',
                color: 'inherit'
              }}>
                {Icon && <Icon />}
              </span>
              <span className="sidebar-item-label">{s.t}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
