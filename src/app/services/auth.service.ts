// src/app/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { Firestore, getDoc } from '@angular/fire/firestore';
import { doc as fsDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { map, Observable, of, switchMap, take, firstValueFrom } from 'rxjs';
import { UsuarioService } from './usuario.service';
import { Usuario } from '../models/usuario';
import { SpinnerService } from './spinner.service';
import { environment } from '../../environments/environments';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private usuarioService = inject(UsuarioService);
  private spinner = inject(SpinnerService);

  authUser$ = user(this.auth);
  uid$: Observable<string | null> = this.authUser$.pipe(map((u) => (u ? u.uid : null)));
  email$: Observable<string | null> = this.authUser$.pipe(map((u) => (u ? u.email : null)));

  me$ = this.uid$.pipe(switchMap((uid) => (uid ? this.usuarioService.getUsuario(uid) : of(null))));

  isAdmin$ = this.me$.pipe(
    switchMap((me) => {
      if (!me) return of(false);
      const whitelisted = !!me.email && (environment.adminWhitelist as string[]).includes(me.email);
      return of(me.rol === 'admin' || !!whitelisted);
    })
  );
  isAdminOnce(): Promise<boolean> {
    return firstValueFrom(this.isAdmin$);
  }

  async setSignInPersistence(remember: boolean): Promise<void> {
    await setPersistence(this.auth, remember ? browserLocalPersistence : browserSessionPersistence);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async resendVerificationEmail(email: string, password: string): Promise<void> {
    this.spinner.show();
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      if (!cred.user.emailVerified) await sendEmailVerification(cred.user);
    } finally {
      await signOut(this.auth);
      this.spinner.hide();
    }
  }

  async register(params: {
    email: string;
    password: string;
    displayName: string;
    rol: 'paciente' | 'especialista' | 'user';
    extra?: Partial<Usuario>;
  }): Promise<string> {
    this.spinner.show();
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, params.email, params.password);
      if (cred.user && params.displayName)
        await updateProfile(cred.user, { displayName: params.displayName });
      if (cred.user) await sendEmailVerification(cred.user);

      const uid = cred.user!.uid;
      const ref = fsDoc(this.firestore as any, 'usuarios', uid);
      const habilitadoDefault = params.rol === 'especialista' ? false : true;

      const payload: Usuario = {
        uid,
        email: params.email,
        displayName: params.displayName,
        rol: params.rol ?? 'user',
        habilitado: habilitadoDefault,
        createdAt: serverTimestamp() as any,
        // emailVerified is omitted here so the object literal matches the Usuario type;
        // email verification state / timestamps are handled separately (e.g. on sign-in).
        ...params.extra,
      };
      await setDoc(ref, payload as any, { merge: true });
      return uid;
    } finally {
      this.spinner.hide();
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    this.spinner.show();
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      const user = cred.user;
      const uid = user.uid;

      const ref = fsDoc(this.firestore as any, 'usuarios', uid);
      const snap = await getDoc(ref);
      let data: Usuario | null = null;

      if (snap.exists()) data = snap.data() as Usuario;
      else {
        const base: Usuario = {
          uid,
          email: user.email || '',
          displayName: user.displayName || '',
          rol: 'user',
          habilitado: true,
          createdAt: serverTimestamp() as any,
        };
        await setDoc(ref, base as any, { merge: true });
        data = base;
      }

      const rol = (data?.rol || 'user') as Usuario['rol'];
      const habilitado = data?.habilitado !== false;

      const requiereVerificacion = rol === 'paciente' || rol === 'especialista';
      if (requiereVerificacion && !user.emailVerified) {
        await signOut(this.auth);
        const err: any = new Error('Email no verificado');
        err.code = 'auth/email-not-verified';
        throw err;
      }
      if (rol === 'especialista' && !habilitado) {
        await signOut(this.auth);
        const err: any = new Error('Cuenta de especialista no aprobada');
        err.code = 'usuario/no-aprobado';
        throw err;
      }
      if (rol !== 'especialista' && !habilitado) {
        await signOut(this.auth);
        const err: any = new Error('Usuario inhabilitado');
        err.code = 'usuario/inhabilitado';
        throw err;
      }

      // ✅ Marcar verificación y último login (visible en Sección Usuarios)
      await setDoc(
        ref,
        {
          emailVerified: user.emailVerified as any,
          emailVerifiedAt: user.emailVerified
            ? (serverTimestamp() as any)
            : (data as any)?.emailVerifiedAt ?? null,
          lastLoginAt: serverTimestamp() as any,
        } as any,
        { merge: true }
      );
    } finally {
      this.spinner.hide();
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigate(['/login']);
  }
}
