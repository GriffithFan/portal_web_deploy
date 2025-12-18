import { useState, useRef, useEffect } from 'react';

export default function TopBar({ onSearch, onLogout, onSelectSection, sections = [], selectedSection, selectedNetwork, onRefreshPredio, getPredioURL }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [recentPredios, setRecentPredios] = useState([]);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const inputRef = useRef(null);
  
  const handleLogoutClick = () => {
    setShowConfirm(true);
  };
  
  const confirmLogout = () => {
    setShowConfirm(false);
    onLogout();
  };
  
  const cancelLogout = () => {
    setShowConfirm(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  useEffect(() => {
    if (showMobileSearch && inputRef.current) {
      // focus puede fallar en navegadores antiguos si el elemento no está visible aún
      try {
        inputRef.current.focus();
      } catch (err) {
        // ignore
        // eslint-disable-next-line no-console
        console.debug('focus failed on mobile search input', err && err.message ? err.message : err);
      }
    }
  }, [showMobileSearch]);

  // track window width to switch between desktop/mobile render
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cargar predios recientes cuando se abre el drawer
  useEffect(() => {
    if (!showDrawer) return;
    try {
      const raw = localStorage.getItem('recentPredios') || '[]';
      const parsed = JSON.parse(raw);
      setRecentPredios(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      setRecentPredios([]);
    }
  }, [showDrawer]);
  
  return (
    <>
  <div className={`topbar ${showMobileSearch ? 'mobile-search-open' : ''}`}>
        {windowWidth <= 900 ? (
          // Mobile minimal: only hamburger (left) and magnifier (right)
          <>
            <button className="mobile-hamburger" type="button" onClick={() => setShowDrawer(true)} aria-label="Abrir menú">
              <svg width="20" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              className="mobile-search-toggle"
              onClick={() => setShowMobileSearch(s => !s)}
              aria-label="Abrir búsqueda"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </button>
          </>
        ) : (
          <> 
            {/* Logo y branding */}
            <div className="topbar-brand">
              <div className="topbar-brand-icon">M</div>
              <div className="topbar-brand-title">Portal</div>
            </div>

            {/* Barra de búsqueda */}
            <form className="topbar-search-form" onSubmit={handleSearch}>
              <div className="topbar-search-wrapper">
                <input
                  ref={inputRef}
                  className="topbar-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar predio por ID o nombre..."
                  aria-label="Buscar predio"
                />
                <button type="submit" className="search-submit" aria-label="Buscar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </button>
              </div>
            </form>

            {/* Agrupar acciones a la derecha para evitar overlap con la búsqueda */}
            <div className="topbar-actions">
              {/* Mobile section selector - visible only on small screens via CSS */}
              {typeof onSelectSection === 'function' && (
                <select
                  className="mobile-section-select"
                  value={selectedSection || ''}
                  onChange={(e) => onSelectSection(e.target.value)}
                  aria-label="Seleccionar sección"
                >
                  {sections.map((s) => (
                    <option key={s.k} value={s.k}>{s.t}</option>
                  ))}
                </select>
              )}

              {/* Botón de logout */}
              <button 
                onClick={handleLogoutClick} 
                title="Cerrar sesión"
                className="topbar-logout"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span className="logout-label">Salir</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile drawer: menu lateral que ocupa el 75% del ancho y 100% alto */}
      {showDrawer && (
        <div className="mobile-drawer" role="dialog" aria-modal="true">
          <div className="mobile-drawer-backdrop" onClick={() => setShowDrawer(false)} />
          <div className="mobile-drawer-content">
            <div className="mobile-drawer-header">
                <div className="mobile-drawer-appname">Portal Meraki</div>
                <button 
                  type="button" 
                  className="mobile-drawer-close" 
                  onClick={() => setShowDrawer(false)}
                  aria-label="Cerrar menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="mobile-drawer-predio">
                <div className="drawer-label">PREDIO</div>
                <a
                  href={getPredioURL ? getPredioURL(selectedNetwork?.predio_code || selectedNetwork?.id, selectedSection) : '#'}
                  onClick={(e) => { e.preventDefault(); if (onRefreshPredio) { onRefreshPredio(); setShowDrawer(false); } }}
                  title="Click para refrescar - Click derecho para abrir en nueva pestana"
                  className="drawer-predio-box"
                  style={{ textDecoration: 'none', cursor: 'pointer' }}
                >
                  {(selectedNetwork && (selectedNetwork.predio_code || selectedNetwork.id)) || 'Sin seleccionar'}
                </a>
              </div>

              <form className="drawer-search-form" onSubmit={(e) => { e.preventDefault(); if (drawerSearch && drawerSearch.trim()) { onSearch(drawerSearch.trim()); setShowDrawer(false); } }}>
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Buscar predio por ID o nombre..."
                  aria-label="Buscar predio en drawer"
                  className="drawer-search-input"
                />
                <button type="submit" className="drawer-search-button" aria-label="Buscar predio">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              </form>

            {/* Navegacion de secciones */}
            {sections.length > 0 && (
              <div className="drawer-sections">
                <div className="drawer-section-title">Secciones</div>
                <div className="drawer-sections-list">
                  {sections.map((s) => (
                    <button
                      key={s.k}
                      type="button"
                      className={`drawer-section-item${selectedSection === s.k ? ' active' : ''}`}
                      onClick={() => { if (onSelectSection) onSelectSection(s.k); setShowDrawer(false); }}
                    >
                      {s.IconComponent && <s.IconComponent />}
                      <span>{s.t}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="drawer-recent">
              <div className="drawer-section-title">Predios frecuentes</div>
              <ul className="drawer-recent-list">
                {recentPredios.length === 0 && <li className="drawer-empty">No hay predios recientes</li>}
                {recentPredios.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="drawer-recent-item" onClick={() => { onSearch(p.id); setShowDrawer(false); }}>
                      <span className="drawer-recent-name">{p.name || p.id}</span>
                      <span className="drawer-recent-id">{p.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mobile search modal (opens on small screens) */}
      {showMobileSearch && (
        <div className="mobile-search-modal" role="dialog" aria-modal="true">
          <div className="mobile-search-backdrop" onClick={() => setShowMobileSearch(false)} />
          <div className="mobile-search-content">
            <form onSubmit={(e) => { handleSearch(e); setShowMobileSearch(false); }} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar predio por ID o nombre..."
                aria-label="Buscar predio"
                style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff' }}
              />
              <button type="submit" style={{ background: '#2563eb', color: '#fff', borderRadius: 8, padding: '10px 14px', border: 'none' }}>Buscar</button>
              <button type="button" onClick={() => setShowMobileSearch(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '10px 12px' }}>Cerrar</button>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de confirmación */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.2s ease'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1a2a3a', fontSize: '18px', fontWeight: '600' }}>
              Cerrar sesión
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
              ¿Estás seguro de que deseas cerrar sesión?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelLogout}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </>
  );
}
