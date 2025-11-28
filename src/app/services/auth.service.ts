import { Injectable, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { map, Observable, of, switchMap, firstValueFrom } from 'rxjs';
import { UsuarioService } from './usuario.service';
import { Usuario } from '../models/usuario';
import { SpinnerService } from './spinner.service';
import { environment } from '../../environments/environments';
import { AuditService } from './audit.service'; // <--- IMPORTANTE

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private usuarioService = inject(UsuarioService);
  private spinner = inject(SpinnerService);
  private env = inject(EnvironmentInjector);
  private audit = inject(AuditService); // <--- INYECTAR

  authUser$: Observable<any>;
  uid$: Observable<string | null>;
  email$: Observable<string | null>;
  me$: Observable<Usuario | null>;
  isAdmin$: Observable<boolean>;

  constructor() {
    this.authUser$ = user(this.auth);
    this.uid$ = this.authUser$.pipe(map((u) => (u ? u.uid : null)));
    this.email$ = this.authUser$.pipe(map((u) => (u ? u.email : null)));

    this.me$ = this.uid$.pipe(
      switchMap((uid) => {
        if (!uid) return of(null);
        return runInInjectionContext(this.env, () => this.usuarioService.getUsuario(uid));
      })
    );

    this.isAdmin$ = this.me$.pipe(
      switchMap((me) => {
        if (!me) return of(false);
        const whitelisted =
          !!me.email && (environment.adminWhitelist as string[]).includes(me.email);
        return of(me.rol === 'admin' || !!whitelisted);
      })
    );
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
      if (cred.user && params.displayName) {
        await updateProfile(cred.user, { displayName: params.displayName });
      }
      if (cred.user) await sendEmailVerification(cred.user);
      const uid = cred.user!.uid;

      const ref = doc(this.firestore, 'usuarios', uid);
      const habilitadoDefault = params.rol === 'especialista' ? false : true;
      const payload: Usuario = {
        uid,
        email: params.email,
        displayName: params.displayName,
        rol: params.rol ?? 'user',
        habilitado: habilitadoDefault,
        createdAt: serverTimestamp() as any,
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

      const ref = doc(this.firestore, 'usuarios', uid);
      const snap = await getDoc(ref);

      let data: Usuario | null = null;
      if (snap.exists()) {
        data = snap.data() as Usuario;
      } else {
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

      // Demo logic
      const demoEmails = [
        'admin@demo.com',
        'especialista@demo.com',
        'especialista2@demo.com',
        'paciente@demo.com',
        'paciente2@demo.com',
        'paciente3@demo.com',
      ];
      const isDemoUser = demoEmails.includes(email);
      const requiereVerificacion = rol === 'paciente' || rol === 'especialista';

      if (requiereVerificacion && !user.emailVerified && !isDemoUser) {
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

      // +++ GUARDAMOS EL LOG DE INGRESO +++
      const nombreUsuario = data?.nombre
        ? `${data.nombre} ${data.apellido || ''}`.trim()
        : user.displayName || user.email || 'Usuario';

      this.audit.logIngreso(nombreUsuario, rol);
    } finally {
      this.spinner.hide();
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigate(['/login']);
  }

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
}
