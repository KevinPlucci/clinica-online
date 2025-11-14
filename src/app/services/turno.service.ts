import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  collectionData,
  doc,
  updateDoc,
  CollectionReference,
  addDoc,
  getDocs,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
// +++ CAMBIO: Importamos las nuevas interfaces +++
import { Turno, HistoriaClinica } from '../models/turno';

@Injectable({
  providedIn: 'root',
})
export class TurnoService {
  private firestore = inject(Firestore);
  private turnosCol: CollectionReference;

  constructor() {
    this.turnosCol = collection(this.firestore, 'turnos');
  }

  // --- Observables (Sin cambios) ---

  getTurnosParaPaciente$(pacienteId: string): Observable<Turno[]> {
    const q = query(this.turnosCol, where('pacienteId', '==', pacienteId));
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  getTurnosParaEspecialista$(especialistaId: string): Observable<Turno[]> {
    const q = query(this.turnosCol, where('especialistaId', '==', especialistaId));
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  getAllTurnos$(): Observable<Turno[]> {
    const q = query(this.turnosCol);
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  // --- Acciones ---

  crearTurno(turno: Omit<Turno, 'id'>): Promise<any> {
    return addDoc(this.turnosCol, turno);
  }

  private async updateTurno(id: string, data: Partial<Turno>) {
    const docRef = doc(this.firestore, `turnos/${id}`);
    return updateDoc(docRef, data as any);
  }

  aceptarTurno(id: string) {
    return this.updateTurno(id, { estado: 'aceptado' });
  }

  rechazarTurno(id: string, motivo: string) {
    return this.updateTurno(id, { estado: 'rechazado', motivoCancelacion: motivo });
  }

  // +++ MODIFICADO +++
  // Ahora recibe el objeto HistoriaClinica completo
  finalizarTurno(id: string, historia: HistoriaClinica) {
    return this.updateTurno(id, {
      estado: 'realizado',
      historiaClinica: historia,
    });
  }

  calificarAtencion(id: string, calificacion: string) {
    return this.updateTurno(id, { comentario: calificacion });
  }

  completarEncuesta(id: string, data: any) {
    return this.updateTurno(id, { encuestaData: data });
  }

  cancelarTurno(id: string, motivo: string) {
    return this.updateTurno(id, { estado: 'cancelado', motivoCancelacion: motivo });
  }

  // --- Funciones Async (Sin cambios) ---

  async getTurnosParaPaciente(pacienteId: string): Promise<Turno[]> {
    const q = query(this.turnosCol, where('pacienteId', '==', pacienteId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Turno));
  }

  async getTurnosParaEspecialista(especialistaId: string): Promise<Turno[]> {
    const q = query(this.turnosCol, where('especialistaId', '==', especialistaId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Turno));
  }
}
