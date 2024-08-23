// app.js
const express = require('express');
const mysql = require('mysql2');
const productoRoutes = require('./routes/productos');

const app = express();
const port = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Configuración de la base de datos
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // Tu usuario de MySQL
  password: '', // Tu contraseña de MySQL
  database: 'ecommerce'
});

// Promisify pool.query para usar async/await
const promisePool = pool.promise();

// Middleware para pasar la conexión a las rutas
app.use((req, res, next) => {
  req.db = promisePool;
  next();
});

// Usar las rutas de productos
app.use('/api/productos', productoRoutes);

// Ruta raíz para prueba
app.get('/', (req, res) => {
  res.send('¡Hola desde el backend!');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
