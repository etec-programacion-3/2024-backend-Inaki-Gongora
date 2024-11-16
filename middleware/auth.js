// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();  // Importa dotenv para cargar variables de entorno

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];  // Extrae el encabezado Authorization
  const token = authHeader && authHeader.split(' ')[1];  // El token debería estar en el formato "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
  }

  // Verifica el token usando la clave secreta almacenada en las variables de entorno
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {  // Usa la clave secreta del .env
    if (err) {
      return res.status(403).json({ message: 'Token inválido o expirado.' });  // 403 para token no válido o expirado
    }

    req.user = user;  // Añade la información del usuario al objeto `req`
    next();  // Continúa con el siguiente middleware o ruta
  });
};

module.exports = authenticateToken;