// src/app/services/audit.service.ts
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore'; // Solo para inyección

// +++ IMPORTANTE: Usamos funciones nativas de 'firebase/firestore' +++
// Esto evita el error "Calling Firebase APIs outside of an Injection context"
import { collection, addDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';

export interface LogIngreso {
  usuario: string;
  rol: string;
  fecha: any;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private auth = inject(Auth);
  private fs = inject(Firestore);

  // --- TU MÉTODO ORIGINAL (Admin Logs) ---
  // Corregido para usar la función nativa 'collection'
  async log(action: string, targetUid: string, details?: Record<string, any>) {
    const actorUid = this.auth.currentUser?.uid ?? 'unknown';
    try {
      // Usamos la instancia 'this.fs' con la función nativa
      const colRef = collection(this.fs, 'adminLogs');

      await addDoc(colRef, {
        action,
        actorUid,
        targetUid,
        details: details ?? null,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Error guardando adminLog:', e);
    }
  }

  // --- NUEVOS MÉTODOS (Sprint 4 - Reportes) ---

  // 1. Guardar ingreso (Se llama desde AuthService)
  async logIngreso(usuario: string, rol: string) {
    try {
      const colRef = collection(this.fs, 'log_ingresos');
      await addDoc(colRef, {
        usuario,
        rol,
        fecha: serverTimestamp(),
      });
    } catch (e) {
      console.error('Error al registrar log de ingreso:', e);
    }
  }

  // 2. Leer ingresos para el gráfico/tabla
  async getLogsIngresos(): Promise<LogIngreso[]> {
    try {
      const colRef = collection(this.fs, 'log_ingresos');
      const q = query(colRef, orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          usuario: data['usuario'],
          rol: data['rol'],
          fecha: data['fecha'],
        };
      });
    } catch (e) {
      console.error(e);
      return [];
    }
  }
}
