const express = require('express');
const router = express.Router();

// Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM productos');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Crear un nuevo producto
router.post('/', async (req, res) => {
  const { nombre, tipo, descripcion, precio, categoria_id, material, color, peso, talla, imagen, disponibilidad } = req.body;

  // Validación básica
  if (!nombre || !tipo || !precio) {
    return res.status(400).json({ message: 'Nombre, tipo y precio son requeridos' });
  }

  try {
    const [result] = await req.db.query(
      'INSERT INTO productos (nombre, tipo, descripcion, precio, categoria_id, material, color, peso, talla, imagen, disponibilidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, tipo, descripcion, precio, categoria_id, material, color, peso, talla, imagen, disponibilidad]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Obtener un producto por ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Actualizar un producto por ID
router.put('/:id', async (req, res) => {
  const { nombre, tipo, descripcion, precio, categoria_id, material, color, peso, talla, imagen, disponibilidad } = req.body;

  // Validación básica
  if (!nombre || !tipo || !precio) {
    return res.status(400).json({ message: 'Nombre, tipo y precio son requeridos' });
  }

  try {
    const [result] = await req.db.query(
      'UPDATE productos SET nombre = ?, tipo = ?, descripcion = ?, precio = ?, categoria_id = ?, material = ?, color = ?, peso = ?, talla = ?, imagen = ?, disponibilidad = ? WHERE id = ?',
      [nombre, tipo, descripcion, precio, categoria_id, material, color, peso, talla, imagen, disponibilidad, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto actualizado con éxito' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Eliminar un producto por ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await req.db.query('DELETE FROM productos WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
