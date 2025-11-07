Proyecto: Clínica Virtual (Gestión de Turnos)

Bienvenido al proyecto de gestión de turnos de la Clínica Virtual. Esta aplicación web permite a pacientes y especialistas administrar sus perfiles, horarios y turnos médicos, mientras que los administradores supervisan el funcionamiento del sistema.

1. Pantallas y Secciones

A continuación se detallan las principales pantallas de la aplicación y sus funcionalidades.

1.1. Acceso y Autenticación

Son las pantallas públicas para el ingreso o registro de nuevos usuarios.

Login (Ingreso)

Pantalla principal de ingreso al sistema.

Formulario de Email y Contraseña.

Funcionalidad de "Recordarme en este dispositivo".

Enlace para "Olvidé mi contraseña".

Botón de "Acceso Rápido" (FAB) en la esquina inferior izquierda, que despliega 6 usuarios de prueba (1 Admin, 2 Especialistas, 3 Pacientes) con sus fotos de perfil para un login veloz.

[Aquí va la captura de pantalla de la pantalla de Login, mostrando el formulario y el botón FAB cerrado]

[Aquí va la captura de la pantalla de Login con el menú FAB desplegado, mostrando los 6 usuarios]

Registro de Usuario

Flujo de registro para nuevos Pacientes o Especialistas.

Selección de Rol: Al ingresar, el usuario debe elegir si se registra como "Paciente" o "Especialista" mediante dos botones rectangulares.

Formulario de Datos: Una vez seleccionado el rol, aparece el formulario correspondiente.

[Aquí va la captura de la pantalla de Selección de Rol, mostrando los dos botones rectangulares]

Formulario de Paciente: Solicita Nombre, Apellido, Edad, DNI, Obra Social, Email, Contraseña y 2 fotos de perfil.

Formulario de Especialista: Solicita Nombre, Apellido, Edad, DNI, Especialidad(es), Email, Contraseña y 1 foto de perfil.

(Sprint 2) Verificación Captcha: Antes de enviar el formulario, el usuario debe completar un desafío reCAPTCHA.

[Aquí va la captura del formulario de Registro de Paciente, mostrando todos los campos y el Captcha]

[Aquí va la captura del formulario de Registro de Especialista, mostrando el selector de especialidades y el Captcha]

1.2. Secciones Privadas (Post-Login)

Estas secciones requieren que el usuario esté autenticado.

Bienvenida (Home)

Pantalla principal a la que se accede después del login. Sirve como portal a las demás secciones.

[Aquí va la captura de la pantalla de Bienvenida]

Mi Perfil

Sección donde tanto pacientes como especialistas pueden ver y (opcionalmente) editar su información personal, incluyendo sus fotos.

[Aquí va la captura de la pantalla "Mi Perfil"]

Gestión de Turnos (Pacientes)

Solicitar Turno: Interfaz donde el paciente puede filtrar por especialidad, especialista y día para reservar un nuevo turno.

Mis Turnos: Listado de todos los turnos solicitados por el paciente (pendientes, confirmados, cancelados, realizados).

[Aquí va la captura de la pantalla "Solicitar Turno"]

[Aquí va la captura del listado "Mis Turnos" del paciente]

Gestión de Agenda (Especialistas)

Configurar Agenda: Panel donde el especialista define sus días y horarios de atención por especialidad.

Mis Turnos: Listado de turnos asignados al especialista, con opciones para aceptar, rechazar o cancelar.

[Aquí va la captura de la "Configuración de Agenda" del especialista]

[Aquí va la captura del listado "Mis Turnos" del especialista]

1.3. Sección de Administración

Panel accesible únicamente por usuarios con rol "Admin".

Gestión de Usuarios

Listado de Usuarios: Muestra a todos los usuarios registrados (Pacientes, Especialistas, Admins).

Habilitación de Especialistas: El administrador debe aprobar manualmente el registro de cada nuevo especialista para que este pueda comenzar a atender.

Habilitar/Deshabilitar Usuarios: El administrador puede bloquear o desbloquear el acceso de cualquier usuario al sistema.

[Aquí va la captura del Dashboard de Administración, mostrando el listado de usuarios y los botones de gestión]

2. Flujos de Acceso

Acceso de Paciente/Especialista: Login -> Bienvenida -> Mi Perfil / Mis Turnos.

Acceso de Administrador: Login -> Gestión de Usuarios.

Flujo de Registro (Especialista): Registro (Rol) -> Registro (Formulario) -> Completar Captcha -> Esperar Habilitación -> Login.
