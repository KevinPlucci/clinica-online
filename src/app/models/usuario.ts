export type Rol = 'admin' | 'paciente' | 'especialista' | 'user';

export interface Usuario {
  uid: string;
  email: string;
  displayName?: string;

  rol: Rol;
  habilitado?: boolean;

  nombre?: string;
  apellido?: string;
  edad?: number;
  dni?: string | number;

  obraSocial?: string;
  especialidades?: string[];

  // Fotos
  fotoURL?: string | null;
  fotoURL1?: string | null;
  fotoURL2?: string | null;

  // Seguimiento
  emailVerified?: boolean; // <- agregado para la grilla
  emailVerifiedAt?: any;
  lastLoginAt?: any;

  createdAt?: any;
  updatedAt?: any;
}
