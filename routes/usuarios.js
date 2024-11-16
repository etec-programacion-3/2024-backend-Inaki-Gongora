// routes/usuarios.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secretKey = 'mondongo';
const authMiddleware = require('../middleware/auth'); // Asegúrate de tener el middleware de autenticación

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

// LOGIN
router.post('/login', async (req, res) => {
  const { email, contraseña } = req.body;
  
  console.log('Datos recibidos:', { email, contraseña });

  try {
    const [rows] = await req.db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    console.log('Resultados de la base de datos:', rows);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(contraseña, user.contraseña);
    
    console.log('Contraseña coincidente:', match);

    if (!match) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '1h' });
    
    // Aquí debes guardar el ID del usuario en la sesión correctamente
    req.session.userId = user.id;  // Se usa `user.id` en lugar de `userId`

    res.json({ message: 'Inicio de sesión exitoso', token });
  } catch (err) {
    console.error('Error en el controlador de inicio de sesión:', err);
    res.status(500).json({ message: err.message });
  }
});

// Ruta para obtener el perfil del usuario
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT nombre, email, telefono, direccion FROM usuarios WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(rows[0]);
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

// Ruta para crear un nuevo usuario
router.post('/', async (req, res) => {
  const { nombre, email, contraseña, direccion, telefono, rol = 'user' } = req.body;

  if (!nombre || !email || !contraseña) {
    return res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
  }

  try {
    // Verificar si el email ya existe en la base de datos
    const [existingUser] = await req.db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'El email ya está en uso' });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Insertar el nuevo usuario en la base de datos
    const [result] = await req.db.query(
      'INSERT INTO usuarios (nombre, email, contraseña, direccion, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, email, hashedPassword, direccion, telefono, rol]
    );

    // Crear un carrito para el nuevo usuario
    const carritoId = await crearCarritoSiNoExiste(result.insertId, req.db);
    if (!carritoId) {
      return res.status(500).json({ message: 'Error al crear el carrito para el usuario' });
    }

    // Responder con los datos del usuario y el carritoId
    res.status(201).json({
      id: result.insertId,
      nombre,
      email,
      direccion,
      telefono,
      rol,
      carritoId
    });
  } catch (err) {
    console.error('Error al crear el usuario:', err);
    res.status(500).json({ message: 'Error al crear el usuario' });
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
