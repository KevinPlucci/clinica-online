// src/app/services/admin-user.service.ts
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environments';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
  Auth,
} from 'firebase/auth';
import { UsuarioService } from './usuario.service';
import { StorageService } from './storage.service';
import { Usuario } from '../models/usuario';

export type RolAlta = 'admin' | 'paciente' | 'especialista';

export interface AltaUsuarioPayload {
  rol: RolAlta;
  email: string;
  password: string;

  nombre: string;
  apellido: string;
  edad: number;
  dni: string;

  // Paciente
  obraSocial?: string;
  pacienteImg1?: File | null;
  pacienteImg2?: File | null;

  // Especialista
  especialidades?: string[];
  especialistaImg?: File | null;

  // Admin
  adminImg?: File | null;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private usuarioService = inject(UsuarioService);
  private storageService = inject(StorageService);

  private getSecondaryAuth(): Auth {
    const name = 'adminSecondary';
    const app: FirebaseApp =
      getApps().find((a) => a.name === name) ?? initializeApp(environment.firebase as any, name);
    return getAuth(app);
  }

  async crearUsuarioComoAdmin(input: AltaUsuarioPayload): Promise<string> {
    const auth = this.getSecondaryAuth();

    // 1) Crear credencial
    const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
    const user = cred.user;
    const uid = user.uid;

    const displayName = `${input.nombre} ${input.apellido}`.trim();
    await updateProfile(user, { displayName });
    await sendEmailVerification(user);

    // 2) Base persistida (emailVerified:false)
    const base: Usuario = {
      uid,
      email: input.email,
      displayName,
      rol: input.rol,
      habilitado: input.rol === 'especialista' ? false : true,
      nombre: input.nombre,
      apellido: input.apellido,
      edad: input.edad,
      dni: input.dni,
      fotoURL: null,
      fotoURL1: null,
      fotoURL2: null,
      // tracking
      createdAt: null as any,
      updatedAt: null as any,
    };

    // 3) Imágenes + persistencia final
    if (input.rol === 'paciente') {
      if (!input.pacienteImg1 || !input.pacienteImg2) {
        await signOut(auth);
        throw new Error('El paciente requiere 2 imágenes de perfil');
      }
      const [url1, url2] = await Promise.all([
        this.storageService.uploadUsuarioImagen(uid, input.pacienteImg1, 'perfil_1.jpg'),
        this.storageService.uploadUsuarioImagen(uid, input.pacienteImg2, 'perfil_2.jpg'),
      ]);
      await this.usuarioService.setUsuario(uid, {
        ...base,
        obraSocial: input.obraSocial || '',
        fotoURL1: url1,
        fotoURL2: url2,
      });
    } else if (input.rol === 'especialista') {
      if (!input.especialistaImg) {
        await signOut(auth);
        throw new Error('El especialista requiere una imagen de perfil');
      }
      const url = await this.storageService.uploadUsuarioImagen(
        uid,
        input.especialistaImg,
        'perfil.jpg'
      );
      await this.usuarioService.setUsuario(uid, {
        ...base,
        especialidades: input.especialidades || [],
        fotoURL: url,
      });
    } else {
      if (!input.adminImg) {
        await signOut(auth);
        throw new Error('El administrador requiere una imagen de perfil');
      }
      const url = await this.storageService.uploadUsuarioImagen(uid, input.adminImg, 'perfil.jpg');
      await this.usuarioService.setUsuario(uid, { ...base, fotoURL: url });
    }

    await signOut(auth);
    return uid;
  }
}
