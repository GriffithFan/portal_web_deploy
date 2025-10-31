import { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

// Componente principal de la aplicación
function App() {
  // sessionUser: username/email
  const [techUser, setTechUser] = useState(() => localStorage.getItem('sessionUser') || '');
  // token devuelto por backend (JWT) — puede ser null
  const [token, setToken] = useState(() => localStorage.getItem('sessionToken') || null);
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('adminKey') || '');

  // Idle timeout (in ms). Cerrar sesión si no hay actividad por 15 minutos.
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
  const lastActivityRef = useRef(Number(localStorage.getItem('lastActivity') || Date.now()));
  const idleTimerRef = useRef(null);

  useEffect(() => {
    // Guardar cambios de sesión en localStorage
    if (techUser) localStorage.setItem('sessionUser', techUser);
    else localStorage.removeItem('sessionUser');
    if (token) localStorage.setItem('sessionToken', token);
    else localStorage.removeItem('sessionToken');
    if (adminKey) localStorage.setItem('adminKey', adminKey);
    else localStorage.removeItem('adminKey');
  }, [techUser, token, adminKey]);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      try { localStorage.setItem('lastActivity', String(lastActivityRef.current)); } catch (e) { console.debug('localStorage write failed', e); }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        // Auto logout on idle
        setTechUser('');
        setToken(null);
        lastActivityRef.current = 0;
        try { localStorage.removeItem('lastActivity'); } catch (e) { console.debug('localStorage remove failed', e); }
      }, IDLE_TIMEOUT_MS);
    };

    // Activity events
    const events = ['mousemove', 'keydown', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, updateActivity));

    // Initialize timer based on stored lastActivity
    const last = Number(localStorage.getItem('lastActivity') || Date.now());
    lastActivityRef.current = last;
    const since = Date.now() - last;
    if (since >= IDLE_TIMEOUT_MS) {
      // already idle
      setTechUser(''); setToken(null);
      try { localStorage.removeItem('lastActivity'); } catch (e) { console.debug('localStorage remove failed', e); }
    } else {
      idleTimerRef.current = setTimeout(() => {
        setTechUser(''); setToken(null);
        try { localStorage.removeItem('lastActivity'); } catch (e) { console.debug('localStorage remove failed', e); }
      }, IDLE_TIMEOUT_MS - since);
    }

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, updateActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [IDLE_TIMEOUT_MS]);

  const handleLogin = (username, jwtToken = null) => {
    setTechUser(username);
    setToken(jwtToken);
    setAdminKey('');
    // mark activity
    lastActivityRef.current = Date.now();
    try { localStorage.setItem('lastActivity', String(lastActivityRef.current)); } catch (e) { console.debug('localStorage write failed', e); }
  };

  const handleLogout = () => {
    setTechUser('');
    setToken(null);
    try { localStorage.removeItem('lastActivity'); } catch (e) { console.debug('localStorage remove failed', e); }
  };

  const handleAdminLogin = (key) => {
    setAdminKey(key);
    setTechUser('');
  };

  const handleAdminLogout = () => {
    setAdminKey('');
  };

  if (adminKey) {
    return <AdminPanel adminKey={adminKey} onLogout={handleAdminLogout} />;
  }

  if (techUser) {
    return <Dashboard user={techUser} token={token} onLogout={handleLogout} />;
  }

  return <Login onLogin={handleLogin} onAdminLogin={handleAdminLogin} />;
}

export default App;
