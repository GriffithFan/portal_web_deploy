// Gestión de técnicos usando archivo JSON
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Función para hashear contraseñas
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Función para validar usuario y contraseña de técnico usando el archivo tecnicos.json
function validarTecnico(username, password) {
  const tecnicosPath = path.join(__dirname, 'tecnicos.json');
  try {
    const data = fs.readFileSync(tecnicosPath, 'utf-8');
    const tecnicos = JSON.parse(data);
    const hashedPassword = hashPassword(password);
    return tecnicos.some(t => t.username === username && t.password === hashedPassword);
  } catch (error) {
    console.error('Error validando técnico:', error.message);
    return false;
  }
}

function listarTecnicos() {
  const tecnicosPath = path.join(__dirname, 'tecnicos.json');
  try {
    const data = fs.readFileSync(tecnicosPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function guardarTecnicos(list) {
  const tecnicosPath = path.join(__dirname, 'tecnicos.json');
  fs.writeFileSync(tecnicosPath, JSON.stringify(list, null, 2), 'utf-8');
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
