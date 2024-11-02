// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado' });

  jwt.verify(token, 'mondongo', (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado' });

    req.user = user; // Añade la información del usuario al objeto `req`
    next();
  });
};

module.exports = authenticateToken;