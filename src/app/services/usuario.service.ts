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
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Usuario, Rol, HorarioConfig } from '../models/usuario';
import { map, Observable, defer } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private firestore = inject(Firestore);
  private audit = inject(AuditService);
  private env = inject(EnvironmentInjector);

  private usersRef = collection(this.firestore, 'usuarios');

  // --- Funciones Observable (Sin Cambios) ---

  usuarios$(): Observable<Usuario[]> {
    return defer(() =>
      runInInjectionContext(this.env, () => collectionData(this.usersRef, { idField: 'uid' }))
    ).pipe(map((arr: any[]) => (arr as Usuario[]) || []));
  }

  getUsuario(uid: string): Observable<Usuario | null> {
    const ref = doc(this.firestore, 'usuarios', uid);
    return defer(() =>
      runInInjectionContext(this.env, () => docData(ref, { idField: 'uid' }))
    ).pipe(map((u: any) => (u ? (u as Usuario) : null)));
  }

  // --- Acciones (Sin Cambios) ---

  async setUsuario(uid: string, data: Partial<Usuario>) {
    const ref = doc(this.firestore, 'usuarios', uid);
    await runInInjectionContext(this.env, () => setDoc(ref, data as any, { merge: true }));
  }

  async updateRol(uid: string, rol: Rol) {
    const ref = doc(this.firestore, 'usuarios', uid);
    await runInInjectionContext(this.env, () => updateDoc(ref, { rol } as any));
    await this.audit.log('usuario/update-rol', uid, { rol });
  }

  async updateHabilitado(uid: string, habilitado: boolean) {
    const ref = doc(this.firestore, 'usuarios', uid);
    const snap = await runInInjectionContext(this.env, () => getDoc(ref));
    if (!snap.exists()) throw new Error('Usuario no encontrado');

    const data = snap.data() as Usuario;
    if (data.rol !== 'especialista') {
      const err: any = new Error('Solo especialistas pueden cambiar estado habilitado');
      err.code = 'usuario/no-especialista';
      throw err;
    }

    await runInInjectionContext(this.env, () => updateDoc(ref, { habilitado } as any));

    await this.audit.log(habilitado ? 'usuario/habilitar' : 'usuario/inhabilitar', uid, {
      email: data.email ?? null,
      before: { habilitado: data.habilitado !== false },
      after: { habilitado },
    });
  }

  async guardarHorariosDisponibles(uid: string, horariosMap: Map<string, HorarioConfig[]>) {
    const disponibilidadObj: { [key: string]: HorarioConfig[] } = {};
    horariosMap.forEach((value, key) => {
      disponibilidadObj[key] = value;
    });

    const ref = doc(this.firestore, 'usuarios', uid);
    await runInInjectionContext(this.env, () =>
      updateDoc(ref, { disponibilidad: disponibilidadObj })
    );
  }

  // +++ INICIO: NUEVAS FUNCIONES ASYNC (Promise) +++

  /**
   * Obtiene TODOS los usuarios (devuelve Promesa)
   * +++ ESTA ES LA FUNCIÓN CORREGIDA +++
   */
  async getAllUsuarios(): Promise<Usuario[]> {
    const querySnapshot = await getDocs(this.usersRef);
    // Mapeamos los documentos y AÑADIMOS EL ID (uid)
    return querySnapshot.docs.map((doc) => {
      return {
        uid: doc.id,
        ...doc.data(),
      } as Usuario;
    });
  }

  /**
   * Obtiene un grupo de usuarios por sus IDs (devuelve Promesa)
   * +++ CORREGIDO TAMBIÉN POR SI ACASO +++
   */
  async getUsuariosPorListaDeIds(ids: string[]): Promise<Usuario[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    // Asumimos menos de 30 IDs
    const q = query(this.usersRef, where('uid', 'in', ids));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      return {
        uid: doc.id,
        ...doc.data(),
      } as Usuario;
    });
  }
  // +++ FIN: NUEVAS FUNCIONES ASYNC +++
}
