import { Routes } from '@angular/router';
import { BienvenidaComponent } from './pages/bienvenida/bienvenida';
import { LoginComponent } from './pages/login/login';
import { RegistroComponent } from './pages/registro/registro';
import { SeccionUsuariosComponent } from './pages/admin/seccion-usuarios/seccion-usuarios';
import { AltaUsuarioComponent } from './pages/admin/alta-usuario/alta-usuario';
import { adminGuard } from './shared/guards/admin-guard';
import { MisTurnosComponent } from './pages/mis-turnos/mis-turnos';
import { authGuard } from './shared/guards/auth.guard';
import { SeccionTurnosComponent } from './pages/admin/seccion-turnos/seccion-turnos';
import { SolicitarTurnoComponent } from './pages/admin/solicitar-turno/solicitar-turno';
import { pacienteAdminGuard } from './shared/guards/paciente-admin-guard';
import { MiPerfilComponent } from './pages/mi-perfil/mi-perfil';
import { SeccionPacientesComponent } from './pages/especialista/seccion-pacientes/seccion-pacientes';

// IMPORTAR EL COMPONENTE DE INFORMES
import { InformesComponent } from './pages/admin/informes/informes';

export const routes: Routes = [
  { path: '', redirectTo: '/bienvenida', pathMatch: 'full' },

  // Animación 1: Fade (Login y Registro)
  {
    path: 'bienvenida',
    component: BienvenidaComponent,
    data: { animation: 'BienvenidaPage' },
  },
  {
    path: 'login',
    component: LoginComponent,
    data: { animation: 'LoginPage' },
  },
  {
    path: 'registro',
    component: RegistroComponent,
    data: { animation: 'RegistroPage' },
  },

  // Animación 2: Slide (Secciones principales)
  {
    path: 'mis-turnos',
    component: MisTurnosComponent,
    canActivate: [authGuard],
    data: { animation: 'MisTurnosPage' },
  },
  {
    path: 'solicitar-turno',
    component: SolicitarTurnoComponent,
    canActivate: [pacienteAdminGuard],
    data: { animation: 'SolicitarTurnoPage' },
  },
  {
    path: 'mi-perfil',
    component: MiPerfilComponent,
    canActivate: [authGuard],
    data: { animation: 'MiPerfilPage' },
  },

  // Alias
  { path: 'usuarios', redirectTo: '/admin/usuarios', pathMatch: 'full' },

  // Admin
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      {
        path: 'usuarios',
        component: SeccionUsuariosComponent,
        data: { animation: 'AdminUsuarios' },
      },
      {
        path: 'usuarios/nuevo',
        component: AltaUsuarioComponent,
        data: { animation: 'AdminAlta' },
      },
      {
        path: 'turnos',
        component: SeccionTurnosComponent,
        data: { animation: 'AdminTurnos' },
      },
      // RUTA DE INFORMES
      {
        path: 'informes',
        component: InformesComponent,
        data: { animation: 'AdminInformes' },
      },
    ],
  },

  // Placeholders
  {
    path: 'paciente',
    children: [{ path: 'turnos', component: BienvenidaComponent }],
  },

  // SECCIÓN ESPECIALISTA
  {
    path: 'especialista',
    children: [
      { path: 'agenda', component: BienvenidaComponent },
      {
        path: 'pacientes',
        component: SeccionPacientesComponent,
        data: { animation: 'EspecialistaPacientes' },
      },
    ],
  },
];
