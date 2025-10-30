import { useEffect, useState } from 'react';

export default function AdminPanel({ adminKey, onLogout }) {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);

  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
  };

  const loadTechnicians = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tecnicos', { headers: adminHeaders });
      if (!res.ok) {
        throw new Error('No se pudieron cargar los técnicos');
      }
      const data = await res.json();
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error cargando técnicos');
    } finally {
      setLoading(false);
    }
  };

  const loadLastSync = async () => {
    try {
      const res = await fetch('/api/predios/last-sync', { headers: adminHeaders });
      if (res.status === 404) {
        setSyncStatus(null);
        return;
      }
      if (!res.ok) throw new Error('Error consultando última sincronización');
      const data = await res.json();
      setSyncStatus(data);
    } catch (err) {
      console.error('No se pudo obtener el estado de sincronización:', err.message);
    }
  };

  useEffect(() => {
    loadTechnicians();
    loadLastSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  const handleChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const handleAddTechnician = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.username || !form.password) {
      setError('Usuario y contraseña son obligatorios');
      return;
    }
    if (!/^[\w.+-]+@[\w.-]+$/.test(form.username)) {
      setError('Ingresa un correo electrónico válido');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      const res = await fetch('/api/tecnicos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo crear el técnico');
      }
      setMessage('Técnico creado correctamente');
      setForm({ username: '', password: '', confirm: '' });
      loadTechnicians();
    } catch (err) {
      setError(err.message || 'Error creando técnico');
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`¿Eliminar el técnico ${username}?`)) return;
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/tecnicos/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo eliminar el técnico');
      }
      setMessage(`Técnico ${username} eliminado`);
      loadTechnicians();
    } catch (err) {
      setError(err.message || 'Error eliminando técnico');
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncProgress(null);
    setSyncLogs([]);
    setError('');
    setMessage('');
    
    try {
      // Usar fetch con streaming en lugar de EventSource
      const response = await fetch('/api/predios/sync-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        }
      });
      
      if (!response.ok) {
        throw new Error('Error iniciando sincronización');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let isDone = false;
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) {
          isDone = true;
          break;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setSyncLoading(false);
              loadLastSync();
              continue;
            }
            
            try {
              const event = JSON.parse(data);
              
              // Actualizar progreso
              if (event.percentage !== undefined) {
                setSyncProgress({
                  current: event.current,
                  total: event.total,
                  percentage: event.percentage,
                  organization: event.organization
                });
              }
              
              // Agregar log
              if (event.message) {
                setSyncLogs(prev => [...prev, {
                  type: event.type,
                  message: event.message,
                  timestamp: new Date().toLocaleTimeString()
                }]);
              }
              
              // Completado
              if (event.type === 'complete') {
                setMessage(`Sincronización completada: ${event.totalPredios} predios catalogados`);
                setSyncStatus({
                  totalOrganizations: event.totalOrganizations,
                  processedOrganizations: event.processedOrganizations,
                  totalPredios: event.totalPredios,
                  finishedAt: new Date().toISOString()
                });
              }
              
              // Error fatal
              if (event.type === 'fatal-error') {
                setError(event.message);
                setSyncLoading(false);
              }
              
            } catch (parseError) {
              console.error('Error parsing SSE:', parseError);
            }
          }
        }
      }
      
    } catch (err) {
      setError(err.message || 'Error durante la sincronización');
      setSyncLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Panel de Administración</h1>
        <button type="button" onClick={onLogout} className="logout-btn">Cerrar sesión</button>
      </header>

      <section className="admin-section">
        <h2>Técnicos registrados</h2>
        {loading ? (
          <p>Cargando técnicos…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {technicians.length === 0 ? (
                <tr>
                  <td colSpan="2">No hay técnicos registrados</td>
                </tr>
              ) : (
                technicians.map((tech) => (
                  <tr key={tech.username}>
                    <td>{tech.username}</td>
                    <td>
                      <button type="button" onClick={() => handleDelete(tech.username)} className="danger-btn">Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-section">
        <h2>Crear nuevo técnico</h2>
        <form onSubmit={handleAddTechnician} className="admin-form">
          <input type="email" value={form.username} onChange={handleChange('username')} placeholder="Correo del técnico" required />
          <input type="password" value={form.password} onChange={handleChange('password')} placeholder="Contraseña (mínimo 8 caracteres)" required />
          <input type="password" value={form.confirm} onChange={handleChange('confirm')} placeholder="Confirmar contraseña" required />
          <button type="submit">Crear técnico</button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Sincronización de predios</h2>
        <button type="button" onClick={handleSync} disabled={syncLoading}>
          {syncLoading ? 'Sincronizando…' : 'Actualizar predios CSV'}
        </button>
        
        {syncProgress && (
          <div className="sync-progress">
            <div className="progress-info">
              <span>Organización {syncProgress.current} de {syncProgress.total}</span>
              <span>{syncProgress.percentage}%</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${syncProgress.percentage}%` }}
              />
            </div>
            {syncProgress.organization && (
              <div className="progress-org">
                Procesando: {syncProgress.organization}
              </div>
            )}
          </div>
        )}
        
        {syncLogs.length > 0 && (
          <div className="sync-logs">
            {syncLogs.slice(-10).map((log, idx) => (
              <div key={idx} className={`sync-log-entry ${log.type}`}>
                <span className="log-time">{log.timestamp}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        )}
        
        {syncStatus && !syncLoading && (
          <div className="sync-summary">
            <div>Última ejecución: {new Date(syncStatus.finishedAt || syncStatus.startedAt).toLocaleString()}</div>
            <div>Organizaciones procesadas: {syncStatus.processedOrganizations}/{syncStatus.totalOrganizations}</div>
            <div>Total en catálogo: {syncStatus.totalPredios ?? 'desconocido'}</div>
          </div>
        )}
      </section>

      {(error || message) && (
        <div className={`admin-feedback ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}
    </div>
  );
}
