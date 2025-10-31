import { useState } from 'react';

export default function Login({ onLogin, onAdminLogin }) {
  const [mode, setMode] = useState('tech');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setUser('');
    setPass('');
    setAdminKey('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (mode === 'admin') {
      if (!adminKey) {
        setError('Ingresa la clave de administrador');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: adminKey })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Clave incorrecta');
        }
        setError('');
        if (typeof onAdminLogin === 'function') {
          onAdminLogin(adminKey);
        }
      } catch (err) {
        setError(err.message || 'Error validando clave');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!user || !pass) {
      setError('Completa usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setError('');
        // data.token puede ser undefined si el backend no devuelve token
        if (typeof onLogin === 'function') onLogin(user, data.token || null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Error de autenticación');
      }
    } catch (err) {
      setError('Error de red o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>{mode === 'admin' ? 'Panel Administrador' : 'Portal Técnico'}</h2>
      <div className="login-tabs">
        <button
          type="button"
          className={mode === 'tech' ? 'active' : ''}
          onClick={() => { setMode('tech'); resetState(); }}
        >
          Técnico
        </button>
        <button
          type="button"
          className={mode === 'admin' ? 'active' : ''}
          onClick={() => { setMode('admin'); resetState(); }}
        >
          Admin
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        {mode === 'admin' ? (
          <input
            type="password"
            placeholder="Clave de administrador"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            autoFocus
          />
        ) : (
          <>
            <input type="email" placeholder="Usuario (email)" value={user} onChange={e => setUser(e.target.value)} autoFocus />
            <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} />
          </>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Procesando…' : mode === 'admin' ? 'Ingresar como admin' : 'Ingresar'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
