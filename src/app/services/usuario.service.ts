// src/app/services/usuario.service.ts
import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  setDoc,
  getDoc,
} from '@angular/fire/firestore';
import { Usuario, Rol } from '../models/usuario';
import { map, Observable, defer } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private firestore = inject(Firestore);
  private audit = inject(AuditService);
  private env = inject(EnvironmentInjector); // para asegurar contexto de inyección

  usuarios$(): Observable<Usuario[]> {
    const col = collection(this.firestore, 'usuarios');
    // Envolvemos collectionData en el contexto de inyección
    return defer(() =>
      runInInjectionContext(this.env, () => collectionData(col, { idField: 'uid' }))
    ).pipe(map((arr: any[]) => (arr as Usuario[]) || []));
  }

  getUsuario(uid: string): Observable<Usuario | null> {
    const ref = doc(this.firestore, 'usuarios', uid);
    // Envolvemos docData en el contexto de inyección
    return defer(() =>
      runInInjectionContext(this.env, () => docData(ref, { idField: 'uid' }))
    ).pipe(map((u: any) => (u ? (u as Usuario) : null)));
  }

  async setUsuario(uid: string, data: Partial<Usuario>) {
    const ref = doc(this.firestore, 'usuarios', uid);
    // Envolvemos setDoc en el contexto de inyección
    await runInInjectionContext(this.env, () => setDoc(ref, data as any, { merge: true }));
  }

  async updateRol(uid: string, rol: Rol) {
    const ref = doc(this.firestore, 'usuarios', uid);
    // Envolvemos updateDoc en el contexto de inyección
    await runInInjectionContext(this.env, () => updateDoc(ref, { rol } as any));
    await this.audit.log('usuario/update-rol', uid, { rol });
  }

  /**
   * Cambia 'habilitado' SOLO si el usuario es ESPECIALISTA. Audita la acción.
   */
  async updateHabilitado(uid: string, habilitado: boolean) {
    const ref = doc(this.firestore, 'usuarios', uid);

    // Envolvemos getDoc en el contexto de inyección
    const snap = await runInInjectionContext(this.env, () => getDoc(ref));
    if (!snap.exists()) throw new Error('Usuario no encontrado');

    const data = snap.data() as Usuario;
    if (data.rol !== 'especialista') {
      const err: any = new Error('Solo especialistas pueden cambiar estado habilitado');
      err.code = 'usuario/no-especialista';
      throw err;
    }

    // Envolvemos updateDoc en el contexto de inyección
    await runInInjectionContext(this.env, () => updateDoc(ref, { habilitado } as any));

    await this.audit.log(habilitado ? 'usuario/habilitar' : 'usuario/inhabilitar', uid, {
      email: data.email ?? null,
      before: { habilitado: data.habilitado !== false },
      after: { habilitado },
    });
  }
}
