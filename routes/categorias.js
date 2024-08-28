const express = require('express');
const router = express.Router();

// Crear una nueva categoría
router.post('/', async (req, res) => {
  const { nombre, descripcion } = req.body;

  try {
    const [result] = await req.db.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion]
    );
    res.status(201).json({ id: result.insertId, nombre, descripcion });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
