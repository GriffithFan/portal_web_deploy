// Controlador de autenticación de usuarios
const jwt = require('jsonwebtoken');
const { buscarPorCorreo } = require('./usuario');

// Iniciar sesión
async function login(req, res) {
  const { correo, contraseña } = req.body;
  // Buscar usuario en la base de datos
  const usuario = await buscarPorCorreo(correo);
  console.log('Usuario encontrado:', usuario);
  console.log('Contraseña recibida:', contraseña);
  if (!usuario) {
    return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
  }
  // Compatibilidad con campo mal codificado
  const passBD = usuario.contraseña || usuario['contrase¤a'] || usuario.password;
  if (passBD !== contraseña) {
    return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
  }
  // Generar token JWT
  const token = jwt.sign({ id: usuario.id, correo: usuario.correo }, process.env.JWT_SECRETO, { expiresIn: '8h' });
  res.json({ token });
}

module.exports = { login };
