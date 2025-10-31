import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { map, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-bienvenida',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './bienvenida.html',
  styleUrls: ['./bienvenida.scss'],
})
export class BienvenidaComponent {
  private auth = inject(AuthService);

  /** Usuario logueado: true si hay sesión, false si no */
  loggedIn$: Observable<boolean> = this.auth.authUser$.pipe(map((u) => !!u));

  /** Es admin según rol/whitelist */
  isAdmin$ = this.auth.isAdmin$;
}
