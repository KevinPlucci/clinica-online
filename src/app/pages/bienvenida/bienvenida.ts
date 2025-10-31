// src/app/pages/bienvenida/bienvenida.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { map, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../models/usuario'; // Asegúrate de que esta ruta sea correcta

@Component({
  selector: 'app-bienvenida',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './bienvenida.html',
  styleUrls: ['./bienvenida.scss'],
})
export class BienvenidaComponent {
  private auth = inject(AuthService);

  me$: Observable<Usuario | null> = this.auth.me$;
  loggedIn$: Observable<boolean> = this.auth.authUser$.pipe(map((u) => !!u));

  getPanelLink(rol: string | undefined | null): string {
    switch (rol) {
      case 'admin':
        return '/admin/usuarios';
      case 'paciente':
        return '/paciente/turnos'; // <-- Ruta futura para pacientes
      case 'especialista':
        return '/especialista/agenda'; // <-- Ruta futura para especialistas
      default:
        return '/bienvenida'; // Fallback por si el rol es indefinido
    }
  }

  /**
   * FIX: Agregamos el método para cerrar sesión
   */
  async logout() {
    await this.auth.signOut();
  }
}
