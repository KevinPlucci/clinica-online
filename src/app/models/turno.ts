import { Timestamp } from '@angular/fire/firestore';

// Define los estados que puede tener un turno
export type TurnoEstado =
  | 'solicitado' // El paciente pide, especialista no vio
  | 'aceptado' // El especialista confirma
  | 'rechazado' // El especialista no puede
  | 'cancelado' // Paciente o especialista lo cancelan antes
  | 'realizado'; // El especialista marca que se completó

// +++ NUEVA INTERFAZ +++
// Define un dato dinámico para la H.C.
export interface DatoDinamico {
  clave: string;
  valor: string;
}

// +++ NUEVA INTERFAZ +++
// Define la estructura de la Historia Clínica
export interface HistoriaClinica {
  altura: number;
  peso: number;
  temperatura: number;
  presion: string;
  datosDinamicos: DatoDinamico[];
}

export interface Turno {
  id: string; // El ID del documento de Firestore
  pacienteId: string;
  especialistaId: string;
  especialidad: string;
  fecha: Timestamp; // Usamos Timestamp de Firestore para fechas
  estado: TurnoEstado;

  // Datos denormalizados
  pacienteNombre: string;
  especialistaNombre: string;

  // Comentarios y Reseñas
  // Usado por el paciente al calificar
  comentario?: string;
  // Usado por paciente o especialista al cancelar/rechazar
  motivoCancelacion?: string;
  // Usado por el paciente en la encuesta
  encuestaData?: any;

  // +++ CAMBIO +++
  // La reseña del especialista ahora es la H.C.
  historiaClinica?: HistoriaClinica;
}
