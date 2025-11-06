// Gestión de técnicos usando archivo JSON
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Función para hashear contraseñas
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Path al archivo de técnicos (FUERA de src/ para no ser sobrescrito por git pull)
const TECNICOS_PATH = path.join(__dirname, '../data/tecnicos.json');

// Inicializar archivo de técnicos si no existe
function initTecnicosFile() {
  const dataDir = path.join(__dirname, '../data');
  
  // Crear directorio data/ si no existe
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[INIT] data/ directory created');
  }
  
  // Si no existe tecnicos.json en data/, crearlo o migrar desde src/
  if (!fs.existsSync(TECNICOS_PATH)) {
    const oldPath = path.join(__dirname, 'tecnicos.json');
    
    // Intentar migrar desde src/tecnicos.json
    if (fs.existsSync(oldPath)) {
      console.log('[MIGRATION] Migrating tecnicos.json from src/ to data/...');
      const oldData = fs.readFileSync(oldPath, 'utf-8');
      fs.writeFileSync(TECNICOS_PATH, oldData, 'utf-8');
      console.log('[MIGRATION] Complete - data/tecnicos.json created');
    } else {
      // Crear archivo con usuarios por defecto
      const defaultUsers = [
        { username: "tecnico1@empresa.com", password: "9010e72389a80487d473017425c6ec7951068abed82a4df32459c91f0e45d2ea" },
        { username: "tecnico2@empresa.com", password: "998aab960cd9f809b09dd12eade1de4a2985f62335d8ff45a775a598ead09b06" },
        { username: "tecnico3@empresa.com", password: "ebeaace31a258620999e9fba185031b757451d37dd76b3bea25c5b897bb46be4" },
        { username: "tecnico4@empresa.com", password: "ae84504e96e41376c2b23e773fc66a6689f60bdd3f68a0909c4a4ccaa554fb2b" },
        { username: "tecnico5@empresa.com", password: "ae4379b9e5aed205fb7a1e6899aaaf7fa1a38d03031bf116331454fc99d02d56" },
        { username: "griffith@fan.com", password: "000c22deec6ed2c7475d34bff05884884bfe71848ffef5571adb66ef8e46aa8f" }
      ];
      fs.writeFileSync(TECNICOS_PATH, JSON.stringify(defaultUsers, null, 2), 'utf-8');
      console.log('[INIT] data/tecnicos.json created with default users');
    }
  }
}

// Ejecutar inicialización al cargar el módulo
initTecnicosFile();

// Función para validar usuario y contraseña de técnico usando el archivo tecnicos.json
function validarTecnico(username, password) {
  try {
    const data = fs.readFileSync(TECNICOS_PATH, 'utf-8');
    const tecnicos = JSON.parse(data);
    const hashedPassword = hashPassword(password);
    return tecnicos.some(t => t.username === username && t.password === hashedPassword);
  } catch (error) {
    console.error('Error validando técnico:', error.message);
    return false;
  }
}

function listarTecnicos() {
  try {
    const data = fs.readFileSync(TECNICOS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function guardarTecnicos(list) {
  fs.writeFileSync(TECNICOS_PATH, JSON.stringify(list, null, 2), 'utf-8');
}

function agregarTecnico(username, password) {
  const list = listarTecnicos();
  if (list.find(t => t.username === username)) return { ok: false, error: 'Usuario ya existe' };
  const hashedPassword = hashPassword(password);
  list.push({ username, password: hashedPassword });
  guardarTecnicos(list);
  return { ok: true };
}

function eliminarTecnico(username) {
  const list = listarTecnicos();
  const next = list.filter(t => t.username !== username);
  if (next.length === list.length) return { ok: false, error: 'Usuario no encontrado' };
  guardarTecnicos(next);
  return { ok: true };
}

module.exports = { validarTecnico, listarTecnicos, agregarTecnico, eliminarTecnico };
