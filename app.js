require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const cors = require('cors');
const session = require('express-session');

// Crear la instancia de la aplicación
const app = express();

// Configuración de CORS
const corsOptions = {
  origin: 'http://localhost:3001', // Cambia al puerto del frontend
  credentials: true, // Permite enviar cookies o encabezados de autenticación
};
app.use(cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json());

// Configuración de la sesión (después de crear 'app')
app.use(session({
  secret: 'mondongo', // Cambia esta clave por algo seguro
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, // En producción usa secure: true y HTTPS
}));

// Configuración de la base de datos usando variables de entorno
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', // Leer de las variables de entorno o usar valor por defecto
  user: process.env.DB_USER || 'root', // Leer de las variables de entorno o usar valor por defecto
  password: process.env.DB_PASSWORD || '', // Leer de las variables de entorno o usar valor por defecto
  database: process.env.DB_NAME || 'zephyr', // Leer de las variables de entorno o usar valor por defecto
  port: process.env.DB_PORT || 3306, // Leer de las variables de entorno o usar valor por defecto
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Promisify pool.query para usar async/await
const promisePool = pool.promise();

// Middleware para pasar la conexión a las rutas
app.use((req, res, next) => {
  req.db = promisePool;
  next();
});

// Importar rutas y middleware
const productoRoutes = require('./routes/productos.js');
const categoriaRoutes = require('./routes/categorias.js');
const usuariosRoutes = require('./routes/usuarios.js');
const carritoRoutes = require('./routes/carrito.js');
const authenticateToken = require('./middleware/auth.js');

// Usar las rutas
app.use('/api/categorias', categoriaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/carritos', authenticateToken, carritoRoutes);

// Configuración de archivos estáticos
console.log(path.join(__dirname, 'public')); // Muestra la ruta completa de la carpeta 'public'
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Ruta raíz para prueba
app.get('/', (req, res) => {
  res.send('¡Hola desde el backend!');
});

// Puerto del servidor
const port = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});