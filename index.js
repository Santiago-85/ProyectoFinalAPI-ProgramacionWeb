const express = require('express');
const { Pool } = require('pg'); 
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const nodemailer = require('nodemailer');
const { create } = require('xmlbuilder2');
const multer = require('multer');
const { parseStringPromise } = require('xml2js');
const { swaggerDocs } = require('./swagger');


const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const port = 3000;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'santiagogares51@gmail.com', 
    pass: 'osgt uzuz egvh rnio'  
  }
});


app.use(cors()); 

app.use(express.json()); 


// Configuracion de la base de datos 
const pool = new Pool({
  user: 'postgres',         
  host: 'localhost',        
  database: 'ProyectoFinal', 
  password: '123', 
  port: 5432,               
});


//Rutas de la api 

// Ruta de prueba para verificar la conexión a la base de datos
/**
 * @swagger
 * /test-db:
 *   get:
 *     summary: Verificar conexión con la base de datos
 *     description: Prueba la conexión a la base de datos PostgreSQL y devuelve la hora actual del servidor.
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: Conexión exitosa
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             example: "Conexión exitosa. Hora del servidor: 2025-10-16 12:34:56.789"
 *       500:
 *         description: Error al conectar con la base de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al conectar con la base de datos"
 */
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`Conexión exitosa. Hora del servidor de la base de datos: ${result.rows[0].now}`);
  } catch (error) {
    console.error('Error al conectar con la base de datos', error);
    res.status(500).send('Error al conectar con la base de datos');
  }
});


// Ruta raíz para verificar que el servidor está funcionando
/**
 * @swagger
 * /:
 *   get:
 *     summary: Verificar el estado de la API
 *     description: Devuelve un mensaje simple confirmando que la API está en ejecución.
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: API activa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "API funcionando correctamente"
 */
app.get('/', (req, res) => {
  res.send('¡La API está funcionando!');
});




// --- Endpoints de la API ---

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registra un nuevo usuario en el sistema
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - correo
 *               - contrasena
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Samuel Andrés
 *               correo:
 *                 type: string
 *                 format: email
 *                 example: usuario@gmail.com
 *               contrasena:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario registrado exitosamente!
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: Samuel Andrés
 *                     correo:
 *                       type: string
 *                       example: usuario@gmail.com
 *       400:
 *         description: Dominio de correo no permitido
 *       409:
 *         description: El correo electrónico ya está registrado
 *       500:
 *         description: Error en el servidor al registrar el usuario
 */
app.post('/register', async (req, res) => {
  const { nombre, correo, contrasena } = req.body;
  const dominiosPermitidos = ['@gmail.com', '@outlook.com'];
  if (!dominiosPermitidos.some(d => correo.endsWith(d))) {
    return res.status(400).json({ message: 'Error: Solo se permiten correos @gmail.com y @outlook.com.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const contrasenaHasheada = await bcrypt.hash(contrasena, salt);
    const nuevoUsuario = await pool.query(
      "INSERT INTO Usuarios (nombre_completo, correo_electronico, contrasena) VALUES ($1, $2, $3) RETURNING *",
      [nombre, correo, contrasenaHasheada]
    );

    // --- LÓGICA DE CORREO ---
    const mailOptions = {
      from: 'santiagogares51@gmail.com',
      to: correo,
      subject: '¡Bienvenido a Servinsa!',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h1 style="color: #0d6efd;">¡Tu cuenta ha sido creada!</h1>
          <p>Hola ${nombre},</p>
          <p>Gracias por registrarte en Servinsa. ¡Ya puedes empezar a reservar tus próximos vuelos!</p>
          <p style="margin-top: 30px;"><a href="http://localhost:4200/login" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Iniciar Sesión</a></p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions); 
    
    res.status(201).json({
      message: 'Usuario registrado exitosamente!',
      usuario: {
        id: nuevoUsuario.rows[0].id_usuario,
        nombre: nuevoUsuario.rows[0].nombre_completo,
        correo: nuevoUsuario.rows[0].correo_electronico
      }
    });

  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
    }
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});


// Endpoint para iniciar sesión
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Inicia sesión de un usuario registrado
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - contrasena
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *                 example: usuario@gmail.com
 *               contrasena:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Inicio de sesión exitoso!
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: Samuel Andrés
 *                     correo:
 *                       type: string
 *                       example: usuario@gmail.com
 *                     es_vip:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Contraseña incorrecta
 *       404:
 *         description: El correo electrónico no está registrado
 *       500:
 *         description: Error en el servidor al intentar iniciar sesión
 */
app.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  try {
    const userQuery = await pool.query(
      "SELECT * FROM Usuarios WHERE correo_electronico = $1",
      [correo]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Error: El correo electrónico no está registrado.' });
    }

    const usuario = userQuery.rows[0];

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!contrasenaValida) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    res.status(200).json({
      message: 'Inicio de sesión exitoso!',
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre_completo,
        correo: usuario.correo_electronico,
        es_vip: usuario.es_vip
      }
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error en el servidor al intentar iniciar sesión.' });
  }
});


// Endpoint para obtener todos los asientos
/**
 * @swagger
 * /asientos:
 *   get:
 *     summary: Obtiene todos los asientos disponibles u ocupados
 *     tags: [Asientos]
 *     responses:
 *       200:
 *         description: Lista de todos los asientos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_asiento:
 *                     type: integer
 *                     example: 12
 *                   fila:
 *                     type: string
 *                     example: A
 *                   numero:
 *                     type: integer
 *                     example: 7
 *                   estado:
 *                     type: string
 *                     example: Disponible
 *       500:
 *         description: Error en el servidor al obtener los asientos
 */
app.get('/asientos', async (req, res) => {
  try {
    const todosLosAsientos = await pool.query('SELECT * FROM Asientos ORDER BY id_asiento');
    res.status(200).json(todosLosAsientos.rows);
  } catch (error) {
    console.error('Error al obtener los asientos:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener los asientos.' });
  }
});



// Endpoint para crear una nueva reserva 
/**
 * @swagger
 * /reservas:
 *   post:
 *     summary: Crea una nueva reserva con uno o más asientos.
 *     description: >
 *       Crea una reserva para el usuario indicado.  
 *       Si el usuario tiene 5 o más reservas previas o ya es VIP, se le aplica un **10% de descuento**.  
 *       También actualiza el estado de los asientos a “Ocupado” y envía un correo de confirmación.
 *     tags:
 *       - Reservas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 example: 3
 *               detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_asiento:
 *                       type: string
 *                       example: "A3"
 *                     nombre_pasajero:
 *                       type: string
 *                       example: "Carlos Gómez"
 *                     cui_pasajero:
 *                       type: string
 *                       example: "1234567890101"
 *                     lleva_maleta:
 *                       type: boolean
 *                       example: true
 *                     precio_asiento:
 *                       type: number
 *                       example: 1200.50
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reserva creada exitosamente!"
 *                 id_reserva:
 *                   type: integer
 *                   example: 45
 *                 descuentoAplicado:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Error en el servidor al crear la reserva.
 */
app.post('/reservas', async (req, res) => {
  const { id_usuario, detalles } = req.body;
  const client = await pool.connect();

  try {
    let esVip = false;
    const userQuery = await client.query('SELECT es_vip, correo_electronico, nombre_completo FROM Usuarios WHERE id_usuario = $1', [id_usuario]);
    const { correo_electronico, nombre_completo } = userQuery.rows[0];

    if (userQuery.rows[0].es_vip) {
      esVip = true;
    } else {
      const countQuery = await client.query('SELECT COUNT(*) FROM Reservas WHERE id_usuario = $1', [id_usuario]);
      const numeroDeReservas = parseInt(countQuery.rows[0].count);
      
      if (numeroDeReservas >= 5) {
        esVip = true;
        if (!userQuery.rows[0].es_vip) {
            await client.query('UPDATE Usuarios SET es_vip = TRUE WHERE id_usuario = $1', [id_usuario]);
        }
      }
    }

    let precioTotalFinal = 0;
    detalles.forEach(detalle => {
      let precioAsiento = parseFloat(detalle.precio_asiento);
      if (esVip) {
        precioAsiento *= 0.90;
      }
      precioTotalFinal += precioAsiento;
    });

    await client.query('BEGIN');

    const reservaQuery = await client.query('INSERT INTO Reservas (id_usuario, precio_total) VALUES ($1, $2) RETURNING id_reserva', [id_usuario, precioTotalFinal]);
    const id_reserva = reservaQuery.rows[0].id_reserva;

    for (const detalle of detalles) {
      const { id_asiento, nombre_pasajero, cui_pasajero, lleva_maleta } = detalle;
      let precioAsientoDetalle = parseFloat(detalle.precio_asiento);
      if (esVip) {
        precioAsientoDetalle *= 0.90;
      }
      
      await client.query('INSERT INTO Detalle_Reserva (id_reserva, id_asiento, nombre_pasajero, cui_pasajero, lleva_maleta, precio_asiento) VALUES ($1, $2, $3, $4, $5, $6)', [id_reserva, id_asiento, nombre_pasajero, cui_pasajero, lleva_maleta, precioAsientoDetalle]);
      await client.query("UPDATE Asientos SET estado = 'Ocupado' WHERE id_asiento = $1", [id_asiento]);
    }

    await client.query('COMMIT');
    
    // --- LÓGICA DE CORREO ÚNICO ---
    let detallesHtml = '';
    let totalCorreo = 0;
    detalles.forEach(detalle => {
        let precioFinalAsiento = parseFloat(detalle.precio_asiento);
        if (esVip) {
            precioFinalAsiento *= 0.90;
        }
        detallesHtml += `<li>Asiento: <b>${detalle.id_asiento}</b> - Pasajero: ${detalle.nombre_pasajero} - Precio: Q${precioFinalAsiento.toFixed(2)}</li>`;
        totalCorreo += precioFinalAsiento;
    });
    const mailOptions = {
        from: 'santiagogares51@gmail.com',
        to: correo_electronico,
        subject: `Confirmación de tu compra de ${detalles.length} asiento(s) en AeroMeso`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #0d6efd;">¡Tu compra ha sido completada!</h1>
            <p>Hola ${nombre_completo},</p>
            <p>Este es el resumen de tu compra:</p>
            <ul>${detallesHtml}</ul>
            <p><b>Total de la compra: Q${totalCorreo.toFixed(2)}</b>${esVip ? ' (Descuento VIP incluido)' : ''}</p>
            <p>¡Gracias por volar con Servinsa!</p>
          </div>
        `
    };
    await transporter.sendMail(mailOptions);
    
    res.status(201).json({ 
        message: 'Reserva creada exitosamente!', 
        id_reserva: id_reserva,
        descuentoAplicado: esVip 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear la reserva:', error);
    res.status(500).json({ message: 'Error en el servidor al crear la reserva.' });
  } finally {
    client.release();
  }
});


// Endpoint para obtener todas las reservas de un usuario específico
/**
 * @swagger
 * /mis-reservas/{id_usuario}:
 *   get:
 *     summary: Obtiene todas las reservas de un usuario.
 *     description: >
 *       Retorna el historial de reservas realizadas por el usuario indicado, incluyendo los detalles de cada asiento reservado.
 *     tags:
 *       - Reservas
 *     parameters:
 *       - in: path
 *         name: id_usuario
 *         required: true
 *         description: ID del usuario del cual se desean obtener las reservas.
 *         schema:
 *           type: integer
 *           example: 3
 *     responses:
 *       200:
 *         description: Lista de reservas del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_reserva:
 *                     type: integer
 *                     example: 45
 *                   id_detalle:
 *                     type: integer
 *                     example: 120
 *                   id_asiento:
 *                     type: string
 *                     example: "A3"
 *                   nombre_pasajero:
 *                     type: string
 *                     example: "Carlos Gómez"
 *                   cui_pasajero:
 *                     type: string
 *                     example: "1234567890101"
 *                   lleva_maleta:
 *                     type: boolean
 *                     example: true
 *                   precio_asiento:
 *                     type: number
 *                     example: 1080.45
 *                   fecha_reserva:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-10-15T18:23:45.000Z"
 *       500:
 *         description: Error en el servidor al obtener las reservas.
 */
app.get('/mis-reservas/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params; 

  try {
    const query = `
      SELECT
        r.id_reserva,
        dr.id_detalle,
        dr.id_asiento,
        dr.nombre_pasajero,
        dr.cui_pasajero,
        dr.lleva_maleta,
        dr.precio_asiento,
        r.fecha_reserva
      FROM Reservas r
      JOIN Detalle_Reserva dr ON r.id_reserva = dr.id_reserva
      WHERE r.id_usuario = $1
      ORDER BY r.fecha_reserva DESC;
    `;

    const resultado = await pool.query(query, [id_usuario]);

    res.status(200).json(resultado.rows);

  } catch (error) {
    console.error('Error al obtener las reservas del usuario:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});


// Endpoint para modificar el asiento de una reserva
/**
 * @swagger
 * /modificar-reserva:
 *   put:
 *     summary: Modifica una reserva existente cambiando el asiento del pasajero.
 *     description: >
 *       Actualiza la reserva de un pasajero cambiando su asiento si el nuevo asiento es válido, de la misma clase y está disponible.
 *       Aplica un recargo del 10% sobre el precio original y notifica al usuario por correo electrónico.
 *     tags:
 *       - Reservas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cui_pasajero:
 *                 type: string
 *                 example: "1234567890101"
 *               id_asiento_antiguo:
 *                 type: string
 *                 example: "A1"
 *               id_asiento_nuevo:
 *                 type: string
 *                 example: "A2"
 *     responses:
 *       200:
 *         description: Reserva modificada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "¡Reserva modificada exitosamente!"
 *       400:
 *         description: Error de validación (asiento no existe, ocupado o clase distinta).
 *       404:
 *         description: No se encontró una reserva que coincida con el CUI y el asiento proporcionados.
 *       500:
 *         description: Error en el servidor.
 */
app.put('/modificar-reserva', async (req, res) => {
  const { cui_pasajero, id_asiento_antiguo, id_asiento_nuevo } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const detalleQuery = await client.query(
      `SELECT dr.*, u.correo_electronico, u.nombre_completo,
              a_antiguo.clase as clase_antigua, a_nuevo.clase as clase_nueva, a_nuevo.estado as estado_nuevo
       FROM Detalle_Reserva dr
       JOIN Reservas r ON dr.id_reserva = r.id_reserva
       JOIN Usuarios u ON r.id_usuario = u.id_usuario
       JOIN Asientos a_antiguo ON dr.id_asiento = a_antiguo.id_asiento
       LEFT JOIN Asientos a_nuevo ON a_nuevo.id_asiento = $3
       WHERE dr.cui_pasajero = $1 AND dr.id_asiento = $2`,
      [cui_pasajero, id_asiento_antiguo, id_asiento_nuevo.toUpperCase()]
    );

    if (detalleQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No se encontró una reserva que coincida con el CUI y el asiento proporcionados.' });
    }

    const detalle = detalleQuery.rows[0];

    // Validaciones
    if (!detalle.clase_nueva) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'El nuevo asiento ingresado no existe.' });
    }
    if (detalle.clase_antigua !== detalle.clase_nueva) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Error: El nuevo asiento debe ser de la misma clase que el original.' });
    }
    if (detalle.estado_nuevo !== 'Disponible') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Error: El nuevo asiento seleccionado ya está ocupado.' });
    }

    const nuevoPrecio = parseFloat(detalle.precio_asiento) * 1.10;

    await client.query(
      'UPDATE Detalle_Reserva SET id_asiento = $1, precio_asiento = $2 WHERE id_detalle = $3',
      [id_asiento_nuevo.toUpperCase(), nuevoPrecio, detalle.id_detalle]
    );
    await client.query("UPDATE Asientos SET estado = 'Disponible' WHERE id_asiento = $1", [id_asiento_antiguo]);
    await client.query("UPDATE Asientos SET estado = 'Ocupado' WHERE id_asiento = $1", [id_asiento_nuevo.toUpperCase()]);

    await client.query('COMMIT');
    
    // Lógica de correo
    const mailOptions = {
        from: 'santiagogares51@gmail.com',
        to: detalle.correo_electronico,
        subject: 'Modificación de tu reserva en Servinsa',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h1 style="color: #0d6efd;">¡Tu reserva ha sido modificada!</h1>
                <p>Hola ${detalle.nombre_completo},</p>
                <p>Te confirmamos que hemos actualizado tu reserva para el pasajero ${detalle.nombre_pasajero}:</p>
                <ul>
                    <li>Asiento anterior: <b>${id_asiento_antiguo}</b></li>
                    <li>Nuevo asiento: <b>${id_asiento_nuevo.toUpperCase()}</b></li>
                    <li>Nuevo precio (con recargo del 10%): <b>Q${nuevoPrecio.toFixed(2)}</b></li>
                </ul>
                <p>¡Gracias por volar con Servinsa!</p>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: '¡Reserva modificada exitosamente!' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al modificar la reserva:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  } finally {
    client.release();
  }
});


// Endpoint para cancelar una reserva
/**
 * @swagger
 * /cancelar-reserva:
 *   delete:
 *     summary: Cancela una reserva existente.
 *     description: >
 *       Elimina la reserva del pasajero y marca el asiento como disponible.  
 *       Envía una notificación por correo electrónico al usuario confirmando la cancelación.
 *     tags:
 *       - Reservas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cui_pasajero:
 *                 type: string
 *                 example: "1234567890101"
 *               id_asiento:
 *                 type: string
 *                 example: "A1"
 *     responses:
 *       200:
 *         description: Reserva cancelada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "¡Reserva cancelada exitosamente!"
 *       404:
 *         description: No se encontró una reserva que coincida con el CUI y el asiento proporcionados.
 *       500:
 *         description: Error en el servidor.
 */
app.delete('/cancelar-reserva', async (req, res) => {
  const { cui_pasajero, id_asiento } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const detalleQuery = await client.query(
        `SELECT dr.*, u.correo_electronico, u.nombre_completo
         FROM Detalle_Reserva dr
         JOIN Reservas r ON dr.id_reserva = r.id_reserva
         JOIN Usuarios u ON r.id_usuario = u.id_usuario
         WHERE dr.cui_pasajero = $1 AND dr.id_asiento = $2`,
        [cui_pasajero, id_asiento]
    );

    if (detalleQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'No se encontró una reserva que coincida con el CUI y el asiento proporcionados.' });
    }
    const detalle = detalleQuery.rows[0];
    
    await client.query('DELETE FROM Detalle_Reserva WHERE id_detalle = $1', [detalle.id_detalle]);
    await client.query("UPDATE Asientos SET estado = 'Disponible' WHERE id_asiento = $1", [id_asiento]);

    await client.query('COMMIT');

    // Lógica de correo
    const mailOptions = {
        from: 'santiagogares51@gmail.com',
        to: detalle.correo_electronico,
        subject: 'Cancelación de tu reserva en Servinsa',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h1 style="color: #dc3545;">Tu reserva ha sido cancelada</h1>
                <p>Hola ${detalle.nombre_completo},</p>
                <p>Te confirmamos que la reserva para el pasajero <b>${detalle.nombre_pasajero}</b> en el asiento <b>${id_asiento}</b> ha sido cancelada exitosamente.</p>
                <p>Esperamos verte de nuevo en Servinsa.</p>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: '¡Reserva cancelada exitosamente!' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al cancelar la reserva:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  } finally {
    client.release();
  }
});

// Endpoint para descargar todas las reservas en formato XML
/**
 * @swagger
 * /reservas/xml:
 *   get:
 *     summary: Genera un archivo XML con todas las reservas.
 *     description: >
 *       Exporta todas las reservas almacenadas en la base de datos en formato **XML**.  
 *       Cada elemento contiene información sobre el asiento, pasajero, usuario, CUI y fecha de reserva.
 *     tags:
 *       - Reservas
 *     responses:
 *       200:
 *         description: Archivo XML generado exitosamente.
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 *               example: |
 *                 <?xml version="1.0"?>
 *                 <flightReservation>
 *                   <flightSeat>
 *                     <seatNumber>A3</seatNumber>
 *                     <passengerName>Carlos Gómez</passengerName>
 *                     <user>carlos@gmail.com</user>
 *                     <idNumber>1234567890101</idNumber>
 *                     <hasLuggage>true</hasLuggage>
 *                     <reservationDate>15/10/2025 18:30</reservationDate>
 *                   </flightSeat>
 *                 </flightReservation>
 *       500:
 *         description: Error al generar el archivo XML.
 */
app.get('/reservas/xml', async (req, res) => {
  try {
    const query = `
      SELECT
        dr.id_asiento AS "seatNumber",
        dr.nombre_pasajero AS "passengerName",
        u.correo_electronico AS "user",
        dr.cui_pasajero AS "idNumber",
        dr.lleva_maleta AS "hasLuggage",
        r.fecha_reserva AS "reservationDate"
      FROM Detalle_Reserva dr
      JOIN Reservas r ON dr.id_reserva = r.id_reserva
      JOIN Usuarios u ON r.id_usuario = u.id_usuario
      ORDER BY r.fecha_reserva DESC;
    `;
    const { rows } = await pool.query(query);

    const root = create({ version: '1.0' }).ele('flightReservation');

    for (const reserva of rows) {
      const flightSeat = root.ele('flightSeat');
      flightSeat.ele('seatNumber').txt(reserva.seatNumber);
      flightSeat.ele('passengerName').txt(reserva.passengerName);
      flightSeat.ele('user').txt(reserva.user);
      flightSeat.ele('idNumber').txt(reserva.idNumber);
      flightSeat.ele('hasLuggage').txt(reserva.hasLuggage);

      const fecha = new Date(reserva.reservationDate);
      const formattedDate = fecha.toLocaleString('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).replace(',', ''); 

      flightSeat.ele('reservationDate').txt(formattedDate);
    }

    const xml = root.end({ prettyPrint: true });

    res.header('Content-Type', 'application/xml');
    res.header('Content-Disposition', 'attachment; filename="reservas.xml"');
    res.send(xml);

  } catch (error) {
    console.error('Error al generar el archivo XML:', error);
    res.status(500).send('Error al generar el archivo XML.');
  }
});

// Endpoint para cargar y procesar un archivo XML de reservas
/**
 * @swagger
 * /reservas/upload-xml:
 *   post:
 *     summary: Cargar archivo XML con reservas de vuelo
 *     description: >
 *       Permite subir un archivo XML con múltiples reservas.  
 *       Se valida cada asiento, usuario y condiciones VIP antes de insertar los datos.  
 *       Si el usuario es VIP se aplica un descuento del 10%.  
 *       Si el pasajero lleva maleta, se agregan Q40.00 al precio.
 *     tags:
 *       - Reservas
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               archivoReservas:
 *                 type: string
 *                 format: binary
 *                 description: Archivo XML con las reservas a procesar.
 *     responses:
 *       200:
 *         description: Archivo procesado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Archivo procesado.
 *                 exitosos:
 *                   type: integer
 *                   example: 3
 *                 errores:
 *                   type: integer
 *                   example: 1
 *                 erroresDetallados:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Error en asiento 12A: El asiento ya está ocupado."]
 *                 duration:
 *                   type: integer
 *                   description: Tiempo total de procesamiento en milisegundos.
 *                   example: 1423
 *       400:
 *         description: Error en el archivo o formato incorrecto.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No se subió ningún archivo o el XML no tiene el formato correcto.
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error en el servidor al procesar el archivo.
 */
app.post('/reservas/upload-xml', upload.single('archivoReservas'), async (req, res) => {
  const startTime = Date.now();

  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo.' });
  }

  try {
    const xmlData = req.file.buffer.toString('utf-8');
    const parsedData = await parseStringPromise(xmlData);
    const asientos = parsedData.flightReservation.flightSeat;

    if (!asientos) {
      return res.status(400).json({ message: 'El archivo XML no tiene el formato correcto.' });
    }

    let exitosos = 0;
    let errores = 0;
    const erroresDetallados = [];

    for (const asiento of asientos) {
      const client = await pool.connect();
      try {
        const idAsiento = asiento.seatNumber[0];
        const correoUsuario = asiento.user[0];
        const llevaMaleta = asiento.hasLuggage[0] === 'true'; 

        //validaciones
        const userQuery = await client.query('SELECT id_usuario, es_vip FROM Usuarios WHERE correo_electronico = $1', [correoUsuario]);
        if (userQuery.rows.length === 0) throw new Error(`El usuario ${correoUsuario} no existe.`);
        const { id_usuario, es_vip } = userQuery.rows[0]; 

        const seatQuery = await client.query('SELECT estado, clase FROM Asientos WHERE id_asiento = $1', [idAsiento]);
        if (seatQuery.rows.length === 0) throw new Error(`El asiento ${idAsiento} no existe.`);
        if (seatQuery.rows[0].estado !== 'Disponible') throw new Error(`El asiento ${idAsiento} ya está ocupado.`);

        const claseAsiento = seatQuery.rows[0].clase;

        let precio = claseAsiento === 'Negocios' ? 250.00 : 150.00;
        if (llevaMaleta) {
          precio += 40.00;
        }

        if (es_vip) {
          precio *= 0.90; 
        }

        //fin de las validaciones

        await client.query('BEGIN');
        const reservaQuery = await client.query('INSERT INTO Reservas (id_usuario, precio_total) VALUES ($1, $2) RETURNING id_reserva', [id_usuario, precio]);
        const id_reserva = reservaQuery.rows[0].id_reserva;

        await client.query(
          'INSERT INTO Detalle_Reserva (id_reserva, id_asiento, nombre_pasajero, cui_pasajero, lleva_maleta, precio_asiento) VALUES ($1, $2, $3, $4, $5, $6)',
          [id_reserva, idAsiento, asiento.passengerName[0], asiento.idNumber[0], llevaMaleta, precio]
        );
        await client.query("UPDATE Asientos SET estado = 'Ocupado' WHERE id_asiento = $1", [idAsiento]);

        await client.query('COMMIT');
        exitosos++;
      } catch (error) {
        await client.query('ROLLBACK');
        errores++;
        erroresDetallados.push(`Error en asiento ${asiento.seatNumber[0]}: ${error.message}`);
      } finally {
        client.release();
      }
    }

    const duration = Date.now() - startTime;
    res.status(200).json({
      message: 'Archivo procesado.',
      exitosos,
      errores,
      erroresDetallados,
      duration
    });

  } catch (error) {
    console.error('Error al procesar el archivo XML:', error);
    res.status(500).json({ message: 'Error en el servidor al procesar el archivo.' });
  }
});

// Endpoint para obtener todos los datos para los reportes
/**
 * @swagger
 * /reportes:
 *   get:
 *     summary: Obtiene reportes generales del sistema.
 *     description: >
 *       Retorna información consolidada de la base de datos:  
 *       - Total de usuarios registrados  
 *       - Asientos ocupados y disponibles por clase  
 *       - Cantidad de reservas por usuario  
 *     tags:
 *       - Reportes
 *     responses:
 *       200:
 *         description: Reporte generado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsuarios:
 *                   type: integer
 *                   example: 15
 *                 reporteAsientos:
 *                   type: object
 *                   properties:
 *                     negociosOcupados:
 *                       type: integer
 *                       example: 4
 *                     negociosLibres:
 *                       type: integer
 *                       example: 6
 *                     economicaOcupados:
 *                       type: integer
 *                       example: 20
 *                     economicaLibres:
 *                       type: integer
 *                       example: 30
 *                 reservasPorUsuario:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       nombre_completo:
 *                         type: string
 *                         example: "Carlos Gómez"
 *                       cantidad_reservas:
 *                         type: integer
 *                         example: 5
 *       500:
 *         description: Error en el servidor al generar los reportes.
 */
app.get('/reportes', async (req, res) => {
  try {
    const totalUsuariosPromise = pool.query('SELECT COUNT(*) FROM Usuarios');

    const asientosPorEstadoPromise = pool.query(
      `SELECT clase, estado, COUNT(*) as cantidad
       FROM Asientos
       GROUP BY clase, estado`
    );

    const reservasPorUsuarioPromise = pool.query(
      `SELECT u.nombre_completo, COUNT(dr.id_detalle) as cantidad_reservas
       FROM Usuarios u
       JOIN Reservas r ON u.id_usuario = r.id_usuario
       JOIN Detalle_Reserva dr ON r.id_reserva = dr.id_reserva
       GROUP BY u.nombre_completo
       ORDER BY cantidad_reservas DESC`
    );

    const [totalUsuariosRes, asientosPorEstadoRes, reservasPorUsuarioRes] = await Promise.all([
      totalUsuariosPromise,
      asientosPorEstadoPromise,
      reservasPorUsuarioPromise
    ]);

    const totalUsuarios = parseInt(totalUsuariosRes.rows[0].count);

    const asientosData = asientosPorEstadoRes.rows;
    const reporteAsientos = {
      negociosOcupados: asientosData.find(r => r.clase === 'Negocios' && r.estado === 'Ocupado')?.cantidad || 0,
      negociosLibres: asientosData.find(r => r.clase === 'Negocios' && r.estado === 'Disponible')?.cantidad || 0,
      economicaOcupados: asientosData.find(r => r.clase === 'Económica' && r.estado === 'Ocupado')?.cantidad || 0,
      economicaLibres: asientosData.find(r => r.clase === 'Económica' && r.estado === 'Disponible')?.cantidad || 0,
    };

    const reservasPorUsuario = reservasPorUsuarioRes.rows;

    res.status(200).json({
      totalUsuarios,
      reporteAsientos,
      reservasPorUsuario
    });

  } catch (error) {
    console.error('Error al generar reportes:', error);
    res.status(500).json({ message: 'Error en el servidor al generar los reportes.' });
  }
});


swaggerDocs(app, port);
// --- Inicia el servidor ---
app.listen(port, () => {
  console.log(`Servidor API escuchando en http://localhost:${port}`);
});