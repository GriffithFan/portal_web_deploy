// Controlador de autenticación
const { validarTecnico, listarTecnicos, agregarTecnico, eliminarTecnico } = require('../usuario');
const { logAdmin } = require('../config/logger');

/**
 * Login de técnicos
 */
exports.loginTecnico = (req, res) => {
  const { username, password } = req.body;
  
  if (validarTecnico(username, password)) {
    return res.json({ success: true });
  }
  
  return res.status(401).json({ 
    success: false, 
    message: 'Credenciales inválidas' 
  });
};

/**
 * Login de administradores
 */
exports.loginAdmin = (req, res) => {
  const { key } = req.body || {};
  
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ 
      success: false, 
      message: 'ADMIN_KEY no configurada' 
    });
  }
  
  if (!key) {
    return res.status(400).json({ 
      success: false, 
      message: 'Clave requerida' 
    });
  }
  
  if (key === process.env.ADMIN_KEY) {
    logAdmin('admin_login', { success: true });
    return res.json({ success: true });
  }
  
  logAdmin('admin_login_failed', { attempt: true });
  return res.status(401).json({ 
    success: false, 
    message: 'Clave incorrecta' 
  });
};

/**
 * Listar técnicos
 */
exports.listarTecnicos = (req, res) => {
  const tecnicos = listarTecnicos();
  res.json(tecnicos);
};

/**
 * Agregar técnico
 */
exports.agregarTecnico = (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      error: 'username y password requeridos' 
    });
  }
  
  // Verificar límite de 40 técnicos
  const tecnicos = listarTecnicos();
  if (tecnicos.length >= 40) {
    logAdmin('tecnico_add_failed', { username, reason: 'limit_reached', currentCount: tecnicos.length });
    return res.status(400).json({ 
      error: 'Límite máximo de técnicos alcanzado (40)' 
    });
  }
  
  const result = agregarTecnico(username, password);
  
  if (!result.ok) {
    return res.status(409).json({ error: result.error });
  }
  
  logAdmin('tecnico_added', { username, totalTecnicos: tecnicos.length + 1 });
  res.json({ ok: true });
};

/**
 * Eliminar técnico
 */
exports.eliminarTecnico = (req, res) => {
  const { username } = req.params;
  
  const result = eliminarTecnico(username);
  
  if (!result.ok) {
    return res.status(404).json({ error: result.error });
  }
  
  logAdmin('tecnico_deleted', { username });
  res.json({ ok: true });
};

/**
 * Middleware: Verificar si es administrador
 */
exports.requireAdmin = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ error: 'ADMIN_KEY no configurada' });
  }
  
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  next();
};

/**
 * Utilidad: Validar admin (header o query)
 */
exports.isAdmin = (req) => {
  const hdr = req.headers['x-admin-key'];
  if (process.env.ADMIN_KEY && hdr === process.env.ADMIN_KEY) return true;
  
  const q = req.query.adminKey;
  if (process.env.ADMIN_KEY && q === process.env.ADMIN_KEY) return true;
  
  // Si no hay ADMIN_KEY definida, permitir para entorno local
  if (!process.env.ADMIN_KEY) return true;
  
  return false;
};
