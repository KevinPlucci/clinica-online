import { InjectionToken } from '@angular/core';

export const IS_ADMIN = new InjectionToken<boolean>('IS_ADMIN', {
  providedIn: 'root',
  factory: () => true, // por defecto habilitado hasta cablear Auth real
});
