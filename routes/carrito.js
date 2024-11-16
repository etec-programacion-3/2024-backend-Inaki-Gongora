// carrito.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const authMiddleware = require('../middleware/auth');  // Middleware para verificar autenticación

// Función para crear un carrito si no existe para el usuario
const crearCarritoSiNoExiste = async (userId, db) => {
  console.log('Verificando carrito para el usuario con ID:', userId);

  try {
    // Verificar si el usuario ya tiene un carrito activo
    const [carrito] = await db.query(
      'SELECT id FROM carritos WHERE usuario_id = ? AND estado = "activo"',
      [userId]
    );

    console.log('Carrito encontrado:', carrito);

    // Si no existe, creamos uno
    if (!carrito || carrito.length === 0) {
      console.log('No se encontró carrito activo, creando uno nuevo...');
      const carritoId = uuidv4();
      console.log('Generando nuevo carrito_id:', carritoId);

      // Crear el carrito para el usuario
      const result = await db.query(
        'INSERT INTO carritos (usuario_id, id, estado) VALUES (?, ?, "activo")',
        [userId, carritoId]
      );
      console.log('Carrito creado con id:', carritoId);

      return carritoId;  // Asegúrate de devolver el carritoId generado
    } else {
      console.log('Carrito ya existe con id:', carrito[0].id);
      return carrito[0].id;  // Ya existe un carrito activo, lo devolvemos
    }
  } catch (error) {
    console.error('Error al verificar o crear el carrito:', error);
    return null;
  }
};


// Ruta para obtener el carrito y sus productos
router.get('/carrito', authMiddleware, async (req, res) => {
  const userId = req.user.id; // Obtenemos el ID del usuario autenticado
  
  try {
    // Primero buscamos el carrito del usuario
    const [carritoResult] = await req.db.query(
      'SELECT id FROM carritos WHERE usuario_id = ?',
      [userId]
    );
    
    // Si no existe el carrito, devolvemos un error
    if (carritoResult.length === 0) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }

    const carritoId = carritoResult[0].id;

    // Obtenemos los productos del carrito
    const [productos] = await req.db.query(
      `SELECT cp.id, p.nombre, p.precio, cp.cantidad
      FROM carrito_productos cp
      JOIN productos p ON cp.producto_id = p.id
      WHERE cp.carrito_id = ?`,
      [carritoId]
    );

    // Devolvemos los productos encontrados
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener productos del carrito:', error);
    res.status(500).json({ message: 'Error interno al obtener productos del carrito' });
  }
});

// Ruta para agregar un producto al carrito
router.post('/producto', authMiddleware, async (req, res) => {
  console.log("Se intentó meter el producto")
  const userId = req.user.id;  // Asegurándonos de obtener el userId de la sesión
  const { productId, cantidad } = req.body;

  try {
    // Asegurarnos de que el carrito existe o lo creamos si no existe
    const carritoId = await crearCarritoSiNoExiste(userId, req.db);

    if (!carritoId) {
      return res.status(500).json({ message: 'Error al crear o encontrar el carrito' });
    }

    // Si el carrito existe, obtenemos su ID
    const [carrito] = await req.db.query('SELECT id FROM carritos WHERE id = ?', [carritoId]);

    if (carrito) {
      // Insertar o actualizar el producto en el carrito
      await req.db.query(
        `INSERT INTO carrito_productos (carrito_id, producto_id, cantidad) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE cantidad = cantidad + ?`,
        [carritoId, productId, cantidad, cantidad]  // Usamos carrito.id para la relación
      );
      res.json({ message: 'Producto agregado al carrito' });
    } else {
      res.status(404).json({ message: 'Carrito no encontrado' });
    }
  } catch (error) {
    console.error('Error al agregar producto al carrito:', error);
    res.status(500).json({ message: 'Error interno al agregar producto' });
  }
});

// Ruta para eliminar un producto del carrito
router.delete('/producto/:productoId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { productoId } = req.params;  // Obtener el productoId desde los parámetros de la URL

  console.log('productoId recibido en el backend:', productoId); // Agrega esta línea para ver el valor

  try {
    const [carrito] = await req.db.query('SELECT id FROM carritos WHERE usuario_id = ? AND estado = "activo"', [userId]);

    if (!carrito) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }

    const result = await req.db.query(
      'DELETE FROM carrito_productos WHERE carrito_id = ? AND producto_id = ?',
      [carrito.id, productoId]  // Usamos el productoId recibido en la URL
    );

    if (result.affectedRows > 0) {
      res.json({ message: 'Producto eliminado correctamente del carrito' });
    } else {
      res.status(404).json({ message: 'Producto no encontrado en el carrito' });
    }
  } catch (error) {
    console.error('Error al eliminar producto del carrito:', error);
    res.status(500).json({ message: 'Error al eliminar el producto del carrito' });
  }
});

// Ruta para actualizar la cantidad de un producto en el carrito
router.put('/producto', authMiddleware, async (req, res) => {
  const userId = req.user.id;  // Asegurándonos de obtener el userId de la sesión
  const { productId, cantidad } = req.body;

  try {
    // Verificamos si el usuario ya tiene un carrito
    const [carrito] = await req.db.query('SELECT id FROM carritos WHERE usuario_id = ? AND estado = "activo"', [userId]);

    if (carrito) {
      // Actualizamos la cantidad del producto en el carrito
      await req.db.query(
        `UPDATE carrito_productos SET cantidad = ? 
         WHERE carrito_id = ? AND producto_id = ?`,
        [cantidad, carrito.id, productId]  // Usamos carrito.id para la relación
      );

      res.json({ message: 'Cantidad del producto actualizada' });
    } else {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }
  } catch (error) {
    console.error('Error al actualizar la cantidad del producto:', error);
    return res.status(500).json({ message: 'Error interno al actualizar producto' });
  }
});

router.get('/', async (req, res) => {
  const userId = req.session.userId; // Obtenemos el ID del usuario de la sesión

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    // 1. Buscar el carrito asociado al usuario
    const [carrito] = await req.db.query('SELECT id FROM carritos WHERE usuario_id= ?', [userId]);

    if (carrito.length === 0) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }

    const carritoId = carrito[0].id;

    // 2. Obtener los productos del carrito
    const [productos] = await req.db.query(
      `
      SELECT cp.id, cp.cantidad, p.id AS producto_id, p.nombre, p.precio, p.imagen
      FROM carrito_productos cp
      INNER JOIN productos p ON cp.producto_id = p.id
      WHERE cp.carrito_id = ?
      `,
      [carritoId]
    );

    res.json(productos); // Devolver los productos en el carrito
  } catch (err) {
    console.error('Error al obtener los productos del carrito:', err);
    res.status(500).json({ message: 'Error al obtener el carrito' });
  }
});


module.exports = router;