// src/app/services/audit.service.ts
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { serverTimestamp } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private auth = inject(Auth);
  private fs = inject(Firestore);

  /**
   * Registra una acción administrativa.
   * @param action Ej: 'usuario/habilitar', 'usuario/inhabilitar'
   * @param targetUid UID del afectado
   * @param details Cualquier metadata útil (email, rol, antes/después)
   */
  async log(action: string, targetUid: string, details?: Record<string, any>) {
    const actorUid = this.auth.currentUser?.uid ?? 'unknown';
    await addDoc(collection(this.fs, 'adminLogs'), {
      action,
      actorUid,
      targetUid,
      details: details ?? null,
      createdAt: serverTimestamp(),
    } as any);
  }
}
