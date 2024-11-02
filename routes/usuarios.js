// routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secretKey = 'mondongo'

// LOGIN
// Ruta de inicio de sesión
router.post('/login', async (req, res) => {
  const { email, contraseña } = req.body;

  try {
    // Buscar usuario por email
    const [rows] = await req.db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // Comparar contraseñas
    const match = await bcrypt.compare(contraseña, user.contraseña);
    if (!match) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Generar token
    const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '1h' });

    res.json({ message: 'Inicio de sesión exitoso', token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Verificar si el email ya existe
router.get('/check-email', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email es requerido' });
  }

  try {
    const [rows] = await req.db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(409).json({ message: 'El email ya está en uso' });
    }
    return res.status(200).json({ message: 'Email disponible' });
  } catch (err) {
    return res.status(500).json({ message: 'Error al verificar el email' });
  }
});

// Crear un nuevo usuario
router.post('/', async (req, res) => {
  const { nombre, email, contraseña, direccion, telefono, rol = 'user' } = req.body; // Asignar 'user' como rol predeterminado

  if (!nombre || !email || !contraseña) {
    return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
  }

  try {
    // Verificar si el email ya existe
    const [existingUser] = await req.db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'El email ya está en uso' });
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);
    const [result] = await req.db.query(
      'INSERT INTO usuarios (nombre, email, contraseña, direccion, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, email, hashedPassword, direccion, telefono, rol] // Usar rol aquí
    );

    res.status(201).json({ id: result.insertId, nombre, email, direccion, telefono, rol });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM usuarios');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Obtener un usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Actualizar un usuario por ID
router.put('/:id', async (req, res) => {
  const { nombre, email, contraseña, direccion, telefono, rol } = req.body;

  try {
    let hashedPassword;
    if (contraseña) {
      hashedPassword = await bcrypt.hash(contraseña, 10);
    }

    const [result] = await req.db.query(
      'UPDATE usuarios SET nombre = ?, email = ?, ' +
      (contraseña ? 'contraseña = ?, ' : '') + 
      'direccion = ?, telefono = ?, rol = ? WHERE id = ?',
      contraseña ? [nombre, email, hashedPassword, direccion, telefono, rol, req.params.id] :
                  [nombre, email, direccion, telefono, rol, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario actualizado con éxito' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Eliminar un usuario por ID
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await req.db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
