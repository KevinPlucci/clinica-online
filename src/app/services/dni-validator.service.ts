// src/app/services/dni-validator.service.ts
import { Injectable, inject } from '@angular/core';
import { AsyncValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Firestore, collection, query, where } from '@angular/fire/firestore';
import { getDocs } from 'firebase/firestore';
import { from, map, of, catchError, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DniValidatorService {
  private firestore = inject(Firestore);

  /** Valida que NO exista otro usuario con el mismo DNI en 'usuarios' */
  dniUnico(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const raw: string = (control.value || '').toString();
      const dni = raw.replace(/\D/g, '');
      if (!dni) return of(null);

      const col = collection(this.firestore, 'usuarios');
      const q = query(col, where('dni', '==', dni));

      return from(getDocs(q)).pipe(
        map((snap) => (snap.empty ? null : { dniExiste: true })),
        catchError(() => of(null)),
        take(1)
      );
    };
  }
}
