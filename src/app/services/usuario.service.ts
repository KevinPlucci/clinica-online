// src/app/services/usuario.service.ts
import { Injectable, inject } from '@angular/core';
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
import { map, Observable } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private firestore = inject(Firestore);
  private audit = inject(AuditService);

  usuarios$(): Observable<Usuario[]> {
    const col = collection(this.firestore, 'usuarios');
    return collectionData(col, { idField: 'uid' }) as Observable<Usuario[]>;
  }

  getUsuario(uid: string): Observable<Usuario | null> {
    const ref = doc(this.firestore, 'usuarios', uid);
    return docData(ref, { idField: 'uid' }).pipe(map((u: any) => (u ? (u as Usuario) : null)));
  }

  async setUsuario(uid: string, data: Partial<Usuario>) {
    const ref = doc(this.firestore, 'usuarios', uid);
    await setDoc(ref, data as any, { merge: true });
  }

  async updateRol(uid: string, rol: Rol) {
    const ref = doc(this.firestore, 'usuarios', uid);
    await updateDoc(ref, { rol } as any);
    await this.audit.log('usuario/update-rol', uid, { rol });
  }

  /**
   * Cambia 'habilitado' SOLO si el usuario es ESPECIALISTA. Audita la acción.
   */
  async updateHabilitado(uid: string, habilitado: boolean) {
    const ref = doc(this.firestore, 'usuarios', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Usuario no encontrado');

    const data = snap.data() as Usuario;
    if (data.rol !== 'especialista') {
      const err: any = new Error('Solo especialistas pueden cambiar estado habilitado');
      err.code = 'usuario/no-especialista';
      throw err;
    }

    await updateDoc(ref, { habilitado } as any);
    await this.audit.log(habilitado ? 'usuario/habilitar' : 'usuario/inhabilitar', uid, {
      email: data.email ?? null,
      before: { habilitado: data.habilitado !== false },
      after: { habilitado },
    });
  }
}
