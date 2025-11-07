import { Timestamp } from '@angular/fire/firestore'; // Asegúrate de tener esta importación si usas serverTimestamp

// Este es el modelo de Horario que usaremos
export interface HorarioConfig {
  dia: number; // 0 (Domingo) a 6 (Sábado)
  desde: string; // "09:00"
  hasta: string; // "17:00"
}

export type Rol = 'paciente' | 'especialista' | 'admin' | 'user';

export interface Usuario {
  uid: string;
  email: string;
  rol: Rol;
  nombre?: string;
  apellido?: string;
  edad?: number;
  dni?: string;
  obraSocial?: string; // Paciente
  especialidades?: string[]; // Especialista
  habilitado?: boolean; // Especialista
  fotoURL?: string; // Especialista
  fotoURL1?: string; // Paciente
  fotoURL2?: string; // Paciente
  displayName?: string; // Legacy o de Auth
  createdAt: any; // Timestamp

  // +++ CAMPO NUEVO PARA HORARIOS +++
  disponibilidad?: {
    [especialidad: string]: HorarioConfig[];
  };

  // +++ CAMPO QUE FALTABA (PARA ARREGLAR ERRORES) +++
  emailVerified?: boolean;
}
