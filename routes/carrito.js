const express = require('express');
const router = express.Router();

// Obtener todos los productos del carrito de un usuario
router.get('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const [rows] = await req.db.query(
      'SELECT carrito.id, carrito.cantidad, productos.nombre, productos.precio FROM carrito ' +
      'JOIN productos ON carrito.producto_id = productos.id WHERE carrito.user_id = ?',
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Carrito vacío' });
    }

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener productos del carrito:', err);
    res.status(500).json({ message: 'Error al obtener productos del carrito' });
  }
});

// Agregar un producto al carrito de un usuario
router.post('/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { producto_id, cantidad } = req.body;

  if (!producto_id || !cantidad) {
    return res.status(400).json({ message: 'El producto y la cantidad son requeridos' });
  }

  try {
    // Verificar si el producto ya está en el carrito
    const [existingProduct] = await req.db.query(
      'SELECT * FROM carrito WHERE user_id = ? AND producto_id = ?',
      [user_id, producto_id]
    );

    if (existingProduct.length > 0) {
      // Si el producto ya está en el carrito, solo actualizamos la cantidad
      await req.db.query(
        'UPDATE carrito SET cantidad = cantidad + ? WHERE user_id = ? AND producto_id = ?',
        [cantidad, user_id, producto_id]
      );
    } else {
      // Si el producto no está en el carrito, lo agregamos
      await req.db.query(
        'INSERT INTO carrito (user_id, producto_id, cantidad) VALUES (?, ?, ?)',
        [user_id, producto_id, cantidad]
      );
    }

    res.status(201).json({ message: 'Producto agregado al carrito' });
  } catch (err) {
    console.error('Error al agregar producto al carrito:', err);
    res.status(500).json({ message: 'Error al agregar producto al carrito' });
  }
});

// Eliminar un producto del carrito de un usuario
router.delete('/:user_id/:producto_id', async (req, res) => {
  const { user_id, producto_id } = req.params;

  try {
    const [result] = await req.db.query(
      'DELETE FROM carrito WHERE user_id = ? AND producto_id = ?',
      [user_id, producto_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado en el carrito' });
    }

    res.json({ message: 'Producto eliminado del carrito' });
  } catch (err) {
    console.error('Error al eliminar producto del carrito:', err);
    res.status(500).json({ message: 'Error al eliminar producto del carrito' });
  }
});

module.exports = router;