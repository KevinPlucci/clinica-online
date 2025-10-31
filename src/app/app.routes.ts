// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { BienvenidaComponent } from './pages/bienvenida/bienvenida';
import { LoginComponent } from './pages/login/login';
import { RegistroComponent } from './pages/registro/registro';
import { SeccionUsuariosComponent } from './pages/admin/seccion-usuarios/seccion-usuarios';
import { AltaUsuarioComponent } from './pages/admin/alta-usuario/alta-usuario';
import { adminGuard } from './shared/guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/bienvenida', pathMatch: 'full' },
  { path: 'bienvenida', component: BienvenidaComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },

  // Alias de compatibilidad
  { path: 'usuarios', redirectTo: '/admin/usuarios', pathMatch: 'full' },

  // Sección de administración (solo admin)
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios', component: SeccionUsuariosComponent },
      { path: 'usuarios/nuevo', component: AltaUsuarioComponent }, // <- alta protegida
    ],
  },
];
