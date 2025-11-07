import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { map, take } from 'rxjs';

/**
 * Redirige al login si el usuario NO está autenticado.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.authUser$.pipe(
    take(1), // Tomamos solo el primer valor para decidir
    map((user) => {
      // Si existe el usuario, permitimos el paso
      if (user) {
        return true;
      }
      // Si no, lo redirigimos al login
      return router.createUrlTree(['/login']);
    })
  );
};
