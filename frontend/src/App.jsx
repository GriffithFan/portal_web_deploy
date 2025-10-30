import { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

// Componente principal de la aplicación
function App() {
  const [techUser, setTechUser] = useState('');
  const [adminKey, setAdminKey] = useState('');

  const handleLogin = (username) => {
    setTechUser(username);
    setAdminKey('');
  };

  const handleLogout = () => {
    setTechUser('');
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
    return <Dashboard user={techUser} onLogout={handleLogout} />;
  }

  return <Login onLogin={handleLogin} onAdminLogin={handleAdminLogin} />;
}

export default App;
