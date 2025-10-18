# ⚙️ Servinsa API

Este es el repositorio del back-end para el sistema de reservas de vuelos Servinsa. La API está construida con Node.js, Express, y se conecta a una base de datos PostgreSQL.

## Características

* Gestión de usuarios (registro e inicio de sesión).
* Sistema de reservas de asientos con lógica de transacciones.
* Manejo de estado de usuario "VIP" con descuentos automáticos.
* Modificación y cancelación de reservas.
* Generación y carga de datos masivos a través de archivos XML.
* Envío de correos electrónicos transaccionales.
* Documentación interactiva con Swagger.

## Prerrequisitos

* [Node.js](https://nodejs.org/) (versión 18 o superior)
* [PostgreSQL](https://www.postgresql.org/download/)

## Instalación y Configuración

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/Santiago-85/ProyectoFinalAPI-ProgramacionWeb](https://github.com/Santiago-85/ProyectoFinalAPI-ProgramacionWeb)
    ```

2.  **Navega a la carpeta del proyecto:**
    ```bash
    cd PROYECTOFINAL-API
    ```

3.  **Instala las dependencias:**
    ```bash
    npm install
    ```

4.  **Configura la base de datos:**
    * Asegúrate de que PostgreSQL esté corriendo.
    * Crea una base de datos (ej. `ProyectoFinal`).
    * Ejecuta los scripts SQL necesarios para crear las tablas (`Usuarios`, `Asientos`, etc.).
    * Configura tus credenciales de la base de datos y de Nodemailer en el archivo `index.js`.

## Uso

1.  **Inicia el servidor:**
    ```bash
    node index.js
    ```
2.  El servidor se ejecutará en `http://localhost:3000`.

## Documentación de la API

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva de Swagger para ver y probar todos los endpoints disponibles:

[http://localhost:3000/api-docs](http://localhost:3000/api-docs)