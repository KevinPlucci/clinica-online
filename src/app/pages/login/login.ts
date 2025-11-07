import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// +++ INICIO CAMBIOS (FAB) +++
// Interface para los usuarios de acceso rápido
interface QuickAccessUser {
  nombre: string;
  rol: string;
  email: string;
  password: string;
  img: string;
}
// +++ FIN CAMBIOS (FAB) +++

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  errorMessage: string | null = null;
  infoMessage: string | null = null;

  // Reenvío de verificación
  showResend = false;
  cooldown = 0;
  private cooldownTimer: any;

  // UX
  showPassword = false;
  isSubmitting = false;

  // +++ INICIO CAMBIOS (FAB) +++
  /**
   * Controla si el menú FAB (Floating Action Button) está abierto.
   */
  isFabOpen = false;

  /**
   * Lista de los 6 usuarios para acceso rápido según lo solicitado.
   * Usamos placehold.co para las imágenes de perfil.
   */
  quickAccessUsers: QuickAccessUser[] = [
    {
      nombre: 'Admin',
      rol: 'Administrador',
      email: 'admin@demo.com',
      password: '123456',
      img: 'https://placehold.co/60x60/334155/FFFFFF?text=A',
    },
    {
      nombre: 'Dr. Demo',
      rol: 'Especialista',
      email: 'especialista@demo.com',
      password: '123456',
      img: 'https://placehold.co/60x60/1d4ed8/FFFFFF?text=E1',
    },
    {
      nombre: 'Dra. Demo',
      rol: 'Especialista',
      email: 'especialista2@demo.com',
      password: '123456',
      img: 'https://placehold.co/60x60/1e3a8a/FFFFFF?text=E2',
    },
    {
      nombre: 'Paciente 1',
      rol: 'Paciente',
      email: 'paciente@demo.com',
      password: '123456',
      img: 'https://placehold.co/60x60/60a5fa/FFFFFF?text=P1',
    },
    {
      nombre: 'Paciente 2',
      rol: 'Paciente',
      email: 'paciente2@demo.com',
      password: '123456',
      img: 'https://placehold.co/60x60/3b82f6/FFFFFF?text=P2',
    },
    {
      nombre: 'Paciente 3',
      rol: 'Paciente',
      email: 'paciente3@demo.com',
      password: '123456',
      img: 'https://placehold.co/60x60/2563eb/FFFFFF?text=P3',
    },
  ];

  /**
   * Alterna la visibilidad del menú FAB.
   */
  toggleFab() {
    this.isFabOpen = !this.isFabOpen;
  }
  // +++ FIN CAMBIOS (FAB) +++

  ngOnDestroy(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  async login() {
    if (this.loginForm.invalid || this.isSubmitting) return;

    this.errorMessage = null;
    this.infoMessage = null;
    this.showResend = false;
    this.isSubmitting = true;

    const { email, password, remember } = this.loginForm.value;

    try {
      // Persistencia antes del signIn
      await this.auth.setSignInPersistence(!!remember);
      await this.auth.signIn(email, password);
      const isAdmin = await this.auth.isAdminOnce();
      await this.router.navigate([isAdmin ? '/admin/usuarios' : '/bienvenida']);
    } catch (error: any) {
      switch (error?.code) {
        case 'auth/email-not-verified':
          this.errorMessage = 'Debés verificar tu correo antes de ingresar.';
          this.infoMessage = 'Podés reenviar el correo de verificación desde aquí.';
          this.showResend = true;
          break;
        case 'usuario/no-aprobado':
          this.errorMessage =
            'Tu cuenta de Especialista está pendiente de aprobación por un administrador.';
          break;
        case 'usuario/inhabilitado':
          this.errorMessage = 'Tu usuario está inhabilitado. Contactá a un administrador.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          this.errorMessage = 'El correo electrónico o la contraseña son incorrectos.';
          break;
        default:
          this.errorMessage = 'Ocurrió un error inesperado. Por favor, intentá de nuevo.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  // Accesos rápidos
  // --- MODIFICADO (FAB) ---
  // Ahora recibe el objeto de usuario completo y cierra el FAB.
  accesoRapido(user: QuickAccessUser) {
    this.loginForm.patchValue({
      email: user.email,
      password: user.password,
      remember: true,
    });
    this.isFabOpen = false;
  }
  // --- FIN MODIFICADO (FAB) ---

  // Reenviar verificación con cooldown
  async reenviarVerificacion() {
    if (this.cooldown > 0) return;
    const { email, password } = this.loginForm.value;
    try {
      await this.auth.resendVerificationEmail(email, password);
      this.infoMessage =
        'Te enviamos un correo de verificación. Revisá tu bandeja y la carpeta de spam.';
      this.errorMessage = null;
      this.startCooldown(60);
    } catch {
      this.errorMessage = 'No pudimos enviar el correo de verificación. Intentá más tarde.';
    }
  }

  private startCooldown(seconds: number) {
    this.cooldown = seconds;
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.cooldown--;
      if (this.cooldown <= 0) {
        this.cooldown = 0;
        clearInterval(this.cooldownTimer);
      }
    }, 1000);
  }

  // Reset de contraseña
  async resetPassword() {
    const email = (this.loginForm.value.email || '').trim();
    if (!email || this.loginForm.get('email')?.invalid) {
      this.errorMessage = 'Ingresá un email válido para recuperar tu contraseña.';
      return;
    }
    try {
      await this.auth.sendPasswordReset(email);
      this.infoMessage = 'Te enviamos un enlace para restablecer tu contraseña.';
      this.errorMessage = null;
    } catch {
      this.errorMessage = 'No pudimos enviar el correo de recuperación. Intentá más tarde.';
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }

  /**
   * FIX: Agregamos la función para volver a Bienvenida
   */
  volverABienvenida() {
    this.router.navigate(['/bienvenida']);
  }
}
