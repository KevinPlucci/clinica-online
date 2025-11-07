import { Timestamp } from '@angular/fire/firestore';

// Define los estados que puede tener un turno
export type TurnoEstado =
  | 'solicitado' // El paciente pide, especialista no vio
  | 'aceptado' // El especialista confirma
  | 'rechazado' // El especialista no puede
  | 'cancelado' // Paciente o especialista lo cancelan antes
  | 'realizado'; // El especialista marca que se completó

export interface Turno {
  id: string; // El ID del documento de Firestore
  pacienteId: string;
  especialistaId: string;
  especialidad: string;
  fecha: Timestamp; // Usamos Timestamp de Firestore para fechas
  estado: TurnoEstado;

  // Datos denormalizados para facilitar la búsqueda y visualización
  pacienteNombre: string;
  especialistaNombre: string;

  // Comentarios y Reseñas
  // Usado por especialista al finalizar o paciente al calificar
  comentario?: string;
  // Usado por paciente o especialista al cancelar/rechazar
  motivoCancelacion?: string;
  // Usado por el paciente en la encuesta
  encuestaData?: any;
}
