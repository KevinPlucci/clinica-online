import { Routes } from '@angular/router';
import { BienvenidaComponent } from './pages/bienvenida/bienvenida';
import { LoginComponent } from './pages/login/login';
import { RegistroComponent } from './pages/registro/registro';
import { SeccionUsuariosComponent } from './pages/admin/seccion-usuarios/seccion-usuarios';
import { AltaUsuarioComponent } from './pages/admin/alta-usuario/alta-usuario';
import { adminGuard } from './shared/guards/admin-guard';

// +++ INICIO MODIFICACIÓN +++
// Importa el nuevo componente y el guardián de autenticación
import { MisTurnosComponent } from './pages/mis-turnos/mis-turnos';
import { authGuard } from './shared/guards/auth.guard';
// +++ FIN MODIFICACIÓN +++

export const routes: Routes = [
  { path: '', redirectTo: '/bienvenida', pathMatch: 'full' },
  { path: 'bienvenida', component: BienvenidaComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },

  // +++ INICIO MODIFICACIÓN +++
  // Nueva ruta para "Mis Turnos", protegida por authGuard
  {
    path: 'mis-turnos',
    component: MisTurnosComponent,
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
