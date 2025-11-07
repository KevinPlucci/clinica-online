import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { map, take } from 'rxjs';

/**
 * Permite el paso solo si el rol es 'paciente' O 'admin'.
 * Redirige a /bienvenida si no lo es.
 */
export const pacienteAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.me$.pipe(
    take(1), // Tomamos solo el primer valor
    map((user) => {
      // Si el rol es paciente O admin, permitimos el paso
      if (user?.rol === 'paciente' || user?.rol === 'admin') {
        return true;
      }

      // Si es especialista o no está logueado, lo redirigimos
      return router.createUrlTree(['/bienvenida']);
    })
  );
};
