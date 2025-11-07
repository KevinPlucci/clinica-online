import { Routes } from '@angular/router';
import { BienvenidaComponent } from './pages/bienvenida/bienvenida';
import { LoginComponent } from './pages/login/login';
import { RegistroComponent } from './pages/registro/registro';
import { SeccionUsuariosComponent } from './pages/admin/seccion-usuarios/seccion-usuarios';
import { AltaUsuarioComponent } from './pages/admin/alta-usuario/alta-usuario';
import { adminGuard } from './shared/guards/admin-guard';

// Importa el nuevo componente y el guardián de autenticación
import { MisTurnosComponent } from './pages/mis-turnos/mis-turnos';
import { authGuard } from './shared/guards/auth.guard';

// Importa el nuevo componente de turnos para el admin (con tu nomenclatura)
import { SeccionTurnosComponent } from './pages/admin/seccion-turnos/seccion-turnos';

// +++ INICIO MODIFICACIÓN (Solicitar Turno) +++
// CORRECCIÓN: La ruta de solicitar-turno NO está en /admin/
import { SolicitarTurnoComponent } from './pages/admin/solicitar-turno/solicitar-turno';
import { pacienteAdminGuard } from './shared/guards/paciente-admin-guard';
// +++ FIN MODIFICACIÓN +++

// +++ INICIO MODIFICACIÓN (Mi Perfil) +++
import { MiPerfilComponent } from './pages/mi-perfil/mi-perfil';
// +++ FIN MODIFICACIÓN +++

export const routes: Routes = [
  { path: '', redirectTo: '/bienvenida', pathMatch: 'full' },
  { path: 'bienvenida', component: BienvenidaComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },

  // Nueva ruta para "Mis Turnos", protegida por authGuard
  {
    path: 'mis-turnos',
    component: MisTurnosComponent,
    canActivate: [authGuard], // Solo usuarios logueados
  },

  // Nueva ruta para "Solicitar Turno", protegida por pacienteAdminGuard
  {
    path: 'solicitar-turno',
    component: SolicitarTurnoComponent,
    canActivate: [pacienteAdminGuard], // Solo paciente o admin
  },

  // +++ INICIO MODIFICACIÓN (Mi Perfil) +++
  // Nueva ruta para "Mi Perfil", protegida por authGuard
  {
    path: 'mi-perfil',
    component: MiPerfilComponent,
    canActivate: [authGuard], // Solo usuarios logueados
  },
  // +++ FIN MODIFICACIÓN +++

  // Alias de compatibilidad
  { path: 'usuarios', redirectTo: '/admin/usuarios', pathMatch: 'full' },

  // Sección de administración (solo admin)
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios', component: SeccionUsuariosComponent },
      { path: 'usuarios/nuevo', component: AltaUsuarioComponent },
      // Nueva ruta para que el admin vea TODOS los turnos
      { path: 'turnos', component: SeccionTurnosComponent },
    ],
  },

  /**
   * FIX: Agregamos las rutas futuras para los otros roles.
   * Por ahora, las redirigimos a 'bienvenida' para que no se rompa la app,
   * pero ya tenés la estructura lista para cuando crees esos componentes.
   */
  {
    path: 'paciente',
    children: [
      { path: 'turnos', component: BienvenidaComponent }, // Reemplazar con PacienteComponent
    ],
  },
  {
    path: 'especialista',
    children: [
      { path: 'agenda', component: BienvenidaComponent }, // Reemplazar con EspecialistaComponent
    ],
  },
];
