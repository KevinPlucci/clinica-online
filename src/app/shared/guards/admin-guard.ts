import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return auth.isAdmin$.pipe(
    take(1),
    map((isAdmin) => {
      if (isAdmin) return true as boolean;
      // Si no es admin o no está logueado, lo mandamos a /login
      router.navigate(['/login']);
      return false as boolean;
    })
  );
};
