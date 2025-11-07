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
  addDoc, // +++ IMPORTAR addDoc +++
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Turno } from '../models/turno';

@Injectable({
  providedIn: 'root',
})
export class TurnoService {
  private firestore = inject(Firestore);

  // Declaramos la variable aquí
  private turnosCol: CollectionReference;

  constructor() {
    // E inicializamos la colección DENTRO del constructor
    this.turnosCol = collection(this.firestore, 'turnos');
  }

  // Obtiene los turnos de un paciente específico
  getTurnosParaPaciente(pacienteId: string): Observable<Turno[]> {
    const q = query(this.turnosCol, where('pacienteId', '==', pacienteId));
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  // Obtiene los turnos de un especialista específico
  getTurnosParaEspecialista(especialistaId: string): Observable<Turno[]> {
    const q = query(this.turnosCol, where('especialistaId', '==', especialistaId));
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  // Obtiene TODOS los turnos para el admin
  getAllTurnos(): Observable<Turno[]> {
    const q = query(this.turnosCol); // Sin filtros
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  // --- Acciones ---

  // +++ INICIO MODIFICACIÓN (Crear Turno) +++
  /**
   * Crea un nuevo documento de turno en la colección
   */
  crearTurno(turno: Omit<Turno, 'id'>): Promise<any> {
    // addDoc genera un ID automático
    return addDoc(this.turnosCol, turno);
  }
  // +++ FIN MODIFICACIÓN +++

  private async updateTurno(id: string, data: Partial<Turno>) {
    const docRef = doc(this.firestore, `turnos/${id}`);
    return updateDoc(docRef, data as any);
  }

  // ACCIONES DE ESPECIALISTA
  aceptarTurno(id: string) {
    return this.updateTurno(id, { estado: 'aceptado' });
  }

  rechazarTurno(id: string, motivo: string) {
    return this.updateTurno(id, { estado: 'rechazado', motivoCancelacion: motivo });
  }

  finalizarTurno(id: string, reseña: string) {
    return this.updateTurno(id, { estado: 'realizado', comentario: reseña });
  }

  // ACCIONES DE PACIENTE
  calificarAtencion(id: string, calificacion: string) {
    return this.updateTurno(id, { comentario: calificacion });
  }

  completarEncuesta(id: string, data: any) {
    // Aquí podrías guardar un objeto más complejo si la encuesta tiene varias preguntas
    return this.updateTurno(id, { encuestaData: data });
  }

  // ACCIÓN DE AMBOS (Y ADMIN)
  cancelarTurno(id: string, motivo: string) {
    return this.updateTurno(id, { estado: 'cancelado', motivoCancelacion: motivo });
  }
}
