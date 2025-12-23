import { useState, useEffect } from 'react';

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

const LocationIcon = ({ size = 14, color = '#64748b' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="3"></circle>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
  </svg>
);

const defaultSections = [
  { k: 'topology', t: 'Topology', IconComponent: TopologyIcon },
  { k: 'switches', t: 'Switches', IconComponent: SwitchIcon },
  { k: 'access_points', t: 'Access Points', IconComponent: WifiIcon },
  { k: 'appliance_status', t: 'Appliance Status', IconComponent: ServerIcon }
];

export default function Sidebar({ section, setSection, sections, selectedNetwork, onRefreshPredio, getPredioURL }) {
  const [collapsed, setCollapsed] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [location, setLocation] = useState({ lat: null, lng: null, error: null, loading: true });
  const items = Array.isArray(sections) && sections.length ? sections : defaultSections;
  
  // Actualizar fecha y hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fallback: obtener ubicación por IP
  const getLocationByIP = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.latitude && data.longitude) {
        setLocation({
          lat: data.latitude,
          lng: data.longitude,
          error: null,
          loading: false,
          source: 'IP'
        });
        return true;
      }
    } catch {
      // Si falla, intentar con otro servicio
      try {
        const response = await fetch('https://ip-api.com/json/?fields=lat,lon');
        const data = await response.json();
        if (data.lat && data.lon) {
          setLocation({
            lat: data.lat,
            lng: data.lon,
            error: null,
            loading: false,
            source: 'IP'
          });
          return true;
        }
      } catch {
        return false;
      }
    }
    return false;
  };

  // Obtener ubicación GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      // Sin GPS, intentar por IP
      getLocationByIP().then(success => {
        if (!success) {
          setLocation({ lat: null, lng: null, error: 'Sin ubicación', loading: false });
        }
      });
      return;
    }

    // Primero intentar con getCurrentPosition (más rápido)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
          source: 'GPS'
        });
      },
      () => {
        // GPS falló, intentar por IP
        getLocationByIP().then(success => {
          if (!success) {
            setLocation({ lat: null, lng: null, error: 'Sin ubicación', loading: false });
          }
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Función para reintentar obtener ubicación
  const retryLocation = () => {
    setLocation({ lat: null, lng: null, error: null, loading: true });
    
    if (!navigator.geolocation) {
      getLocationByIP().then(success => {
        if (!success) {
          setLocation({ lat: null, lng: null, error: 'Sin ubicación', loading: false });
        }
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
          source: 'GPS'
        });
      },
      () => {
        // GPS falló, intentar por IP
        getLocationByIP().then(success => {
          if (!success) {
            setLocation({ lat: null, lng: null, error: 'Sin ubicación', loading: false });
          }
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Formatear fecha y hora
  const formatDateTime = (date) => {
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return date.toLocaleString('es-MX', options);
  };
  
  // Handler para click en predio (refrescar datos)
  const handlePredioClick = (e) => {
    e.preventDefault();
    if (onRefreshPredio) {
      onRefreshPredio();
    }
  };

  // Handler para click en sección
  const handleSectionClick = (e, sectionKey) => {
    e.preventDefault();
    setSection(sectionKey);
  };

  // Obtener URL del predio para click derecho
  const predioCode = selectedNetwork?.predio_code || selectedNetwork?.predioCode || selectedNetwork?.id;
  const predioURL = getPredioURL ? getPredioURL(predioCode, section) : '#';

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
            <a
              href={predioURL}
              onClick={handlePredioClick}
              title="Click para refrescar • Click derecho para abrir en nueva pestaña"
              style={{
                fontSize: '15px',
                fontWeight: '700',
                color: '#1e293b',
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'block',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#2563eb'}
              onMouseLeave={(e) => e.target.style.color = '#1e293b'}
            >
              {/* Mostrar nombre del predio si existe, si no mostrar predio_code o id */}
              {selectedNetwork.name || selectedNetwork.predio_code || selectedNetwork.predioCode || selectedNetwork.id}
            </a>
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
          const sectionURL = getPredioURL ? getPredioURL(predioCode, s.k) : '#';
          return (
            <a 
              key={s.k} 
              href={sectionURL}
              onClick={(e) => handleSectionClick(e, s.k)}
              title={collapsed ? s.t : 'Click derecho para abrir en nueva pestaña'}
              className={"sidebar-item" + (isActive ? ' active' : '') + (collapsed ? ' collapsed' : '')}
              style={{ textDecoration: 'none' }}
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
            </a>
          );
        })}
      </div>
      
      {/* Indicador de fecha y hora para capturas */}
      <div className="sidebar-datetime" style={{
        marginTop: 'auto',
        padding: collapsed ? '12px 8px' : '16px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        textAlign: 'center',
        transition: 'all 0.3s ease'
      }}>
        {!collapsed ? (
          <>
            <div style={{
              fontSize: '10px',
              fontWeight: '600',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px'
            }}>
              Fecha y Hora
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              fontFamily: 'monospace',
              letterSpacing: '0.3px'
            }}>
              {formatDateTime(currentDateTime)}
            </div>
            {/* Ubicación GPS */}
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: '600',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px'
              }}>
                <LocationIcon size={12} color="#94a3b8" />
                Ubicación GPS
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: location.error ? '#ef4444' : '#475569',
                fontFamily: 'monospace',
                letterSpacing: '0.3px'
              }}>
                {location.loading ? (
                  <span style={{ color: '#94a3b8' }}>Obteniendo...</span>
                ) : location.error ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <span>{location.error}</span>
                    <button
                      onClick={retryLocation}
                      style={{
                        padding: '4px 10px',
                        fontSize: '10px',
                        background: '#e2e8f0',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#475569',
                        fontWeight: '600'
                      }}
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <span>{location.lat?.toFixed(7)}, {location.lng?.toFixed(7)}</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            fontSize: '10px',
            fontWeight: '600',
            color: '#475569',
            fontFamily: 'monospace',
            lineHeight: '1.4'
          }} title={`${formatDateTime(currentDateTime)}${location.lat ? ` | GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : ''}`}>
            <div>{currentDateTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
            <div style={{ marginTop: '4px' }}><LocationIcon size={12} color="#475569" /></div>
          </div>
        )}
      </div>
    </div>
  );
}
