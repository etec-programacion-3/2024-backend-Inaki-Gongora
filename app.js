// app.js
require('dotenv').config();  // Cargar variables de entorno desde .env
const express = require('express');
const mysql = require('mysql2');
const productoRoutes = require('./routes/productos.js');
const categoriaRoutes = require('./routes/categorias.js');
const usuariosRoutes = require('./routes/usuarios.js');
const path = require('path')
const cors = require('cors');



const app = express();
const port = process.env.PORT || 3000;  // Usar el puerto de las variables de entorno o 3000 por defecto

// Middleware para parsear JSON
app.use(express.json());
app.use(cors());
// Configuración de la base de datos usando variables de entorno
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',  // Leer de las variables de entorno o usar valor por defecto
  user: process.env.DB_USER || 'root',       // Leer de las variables de entorno o usar valor por defecto
  password: process.env.DB_PASSWORD || '',   // Leer de las variables de entorno o usar valor por defecto
  database: process.env.DB_NAME || 'zephyr',  // Leer de las variables de entorno o usar valor por defecto
  port: process.env.DB_PORT || 3306,         // Leer de las variables de entorno o usar valor por defecto
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promisify pool.query para usar async/await
const promisePool = pool.promise();

// Middleware para pasar la conexión a las rutas
app.use((req, res, next) => {
  req.db = promisePool;
  next();
});

// Usar las rutas de productos

app.use('/api/categorias', categoriaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos', productoRoutes);

console.log(path.join(__dirname, 'public')); // Muestra la ruta completa de la carpeta 'public'
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
// Ruta raíz para prueba
app.get('/', (req, res) => {
  res.send('¡Hola desde el backend!');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});




function convertImageToBlob(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 1);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

// convertImageToBlob('https://picsum.photos/1920/1080')
// .then((blob) => {
//   console.log(blob);
// })
// .catch((error) => {
//   console.error(error);
// });