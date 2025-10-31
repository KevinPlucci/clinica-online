import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  accesoRapido(tipo: 'paciente' | 'especialista' | 'admin') {
    const presets: any = {
      paciente: { email: 'paciente@demo.com', password: '123456', remember: true },
      especialista: { email: 'especialista@demo.com', password: '123456', remember: true },
      admin: { email: 'admin@demo.com', password: '123456', remember: true },
    };
    this.loginForm.patchValue(presets[tipo]);
  }

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
}
