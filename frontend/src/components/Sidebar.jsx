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
    <div style={{
      width: collapsed ? '60px' : '260px',
      background: '#fff',
      borderRadius: '12px',
      padding: collapsed ? '12px 6px' : '16px 12px',
      boxShadow: '0 2px 16px rgba(44,62,80,0.1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      position: 'relative'
    }}>
      {/* Header con Network info y botón de colapsar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: '32px',
        marginBottom: collapsed ? '8px' : '12px',
        paddingBottom: collapsed ? '8px' : '12px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Network info */}
        {!collapsed && selectedNetwork && (
          <div style={{ flex: 1, marginRight: '8px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px'
            }}>
              Network
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1e293b'
            }}>
              {(() => {
                // Prioridad: predio_code > predioCode > extraer de nombre si es numérico > id
                const code = selectedNetwork.predio_code || selectedNetwork.predioCode;
                if (code) return code;
                
                // Intentar extraer número de 6 dígitos del nombre
                const name = selectedNetwork.name || '';
                const match = name.match(/\b\d{6}\b/);
                if (match) return match[0];
                
                // Fallback al ID
                return selectedNetwork.id;
              })()}
            </div>
          </div>
        )}
        
        {/* Botón para colapsar/expandir */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
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
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
      
      {/* Items del menú */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map(s => {
          const isActive = section === s.k;
          const Icon = s.IconComponent;
          return (
            <button 
              key={s.k} 
              onClick={() => setSection(s.k)}
              title={collapsed ? s.t : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                padding: collapsed ? '10px 6px' : '12px 14px',
                borderRadius: '10px',
                border: 'none',
                background: isActive 
                  ? 'linear-gradient(135deg, #4a90e2 0%, #357ab8 100%)' 
                  : 'transparent',
                color: isActive ? '#fff' : '#475569',
                cursor: 'pointer',
                fontWeight: isActive ? '600' : '500',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 2px 8px rgba(74, 144, 226, 0.3)' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#1e293b';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
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
              {!collapsed && (
                <span style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {s.t}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
