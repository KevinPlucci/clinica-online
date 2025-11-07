import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
  ValidationErrors,
  AbstractControl,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
// ❌ Se deja de usar el StorageService directo
// import { StorageService } from '../../services/storage.service';
import { ImageUtilsService } from '../../services/image-utils.service';
import { DniValidatorService } from '../../services/dni-validator.service';

// +++ INICIO CAMBIOS (CAPTCHA) +++
// Importamos el módulo de ngx-captcha
import { NgxCaptchaModule } from 'ngx-captcha';
// +++ FIN CAMBIOS (CAPTCHA) +++

const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,}$/;
const DNI_PATTERN = /^\d{7,9}$/;
function atLeastOne(control: AbstractControl): ValidationErrors | null {
  const arr = control as FormArray;
  return arr && arr.length > 0 ? null : { atLeastOne: true };
}

/** Helpers de normalización */
function titleCase(s: string) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
function normalizeDni(s: string) {
  return (s || '').replace(/\D/g, '');
}
function trimSpaces(s: string) {
  return (s || '').trim().replace(/\s+/g, ' ');
}

@Component({
  selector: 'app-registro',
  standalone: true,
  // +++ INICIO CAMBIOS (CAPTCHA) +++
  // Agregamos NgxCaptchaModule a los imports del componente
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgxCaptchaModule],
  // +++ FIN CAMBIOS (CAPTCHA) +++
  templateUrl: './registro.html',
  styleUrls: ['./registro.scss'],
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  // ❌ private storage = inject(StorageService);
  private imgUtils = inject(ImageUtilsService);
  private dniVal = inject(DniValidatorService);
  private router = inject(Router);

  // --- MODIFICADO (Selección de Rol) ---
  // Inicia como 'null' para mostrar la pantalla de selección primero.
  rolSeleccionado: 'paciente' | 'especialista' | null = null;
  // --- FIN MODIFICADO ---

  // +++ INICIO CAMBIOS (CAPTCHA) +++
  /**
   * Clave del sitio de Google reCAPTCHA v2.
   * ¡PEGÁ ACÁ TU CLAVE DE SITIO NUEVA! (La que empieza con "6L...")
   */
  recaptchaSiteKey = 'PONÉ_ACÁ_TU_NUEVA_CLAVE_DE_SITIO';
  // +++ FIN CAMBIOS (CAPTCHA) +++

  // Archivos + previews + progreso
  pacienteFile1: File | null = null;
  pacienteFile2: File | null = null;
  especialistaFile: File | null = null;

  pacientePreview1: string | null = null;
  pacientePreview2: string | null = null;
  especialistaPreview: string | null = null;

  pacienteProg1 = 0;
  pacienteProg2 = 0;
  especialistaProg = 0;

  statusMsg: string | null = null;

  especialidadesDisponibles: string[] = [
    'Clínica Médica',
    'Pediatría',
    'Cardiología',
    'Dermatología',
    'Neurología',
    'Traumatología',
  ];
  nuevaEspecialidad = '';

  // +++ INICIO CAMBIOS (Selección de Rol) +++
  /**
   * Asigna el rol seleccionado y muestra el formulario correspondiente.
   * @param rol 'paciente' o 'especialista'
   */
  seleccionarRol(rol: 'paciente' | 'especialista') {
    this.rolSeleccionado = rol;
  }
  // +++ FIN CAMBIOS (Selección de Rol) +++

  pacienteForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(NAME_PATTERN)]],
    apellido: ['', [Validators.required, Validators.pattern(NAME_PATTERN)]],
    edad: [null, [Validators.required, Validators.min(0), Validators.max(120)]],
    dni: ['', [Validators.required, Validators.pattern(DNI_PATTERN)], [this.dniVal.dniUnico()]],
    obraSocial: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    // +++ INICIO CAMBIOS (CAPTCHA) +++
    recaptcha: ['', Validators.required],
    // +++ FIN CAMBIOS (CAPTCHA) +++
  });

  especialistaForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(NAME_PATTERN)]],
    apellido: ['', [Validators.required, Validators.pattern(NAME_PATTERN)]],
    edad: [null, [Validators.required, Validators.min(0), Validators.max(120)]],
    dni: ['', [Validators.required, Validators.pattern(DNI_PATTERN)], [this.dniVal.dniUnico()]],
    especialidades: this.fb.array<string>([], { validators: atLeastOne }),
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    // +++ INICIO CAMBIOS (CAPTCHA) +++
    recaptcha: ['', Validators.required],
    // +++ FIN CAMBIOS (CAPTCHA) +++
  });

  get especialidadesFA(): FormArray {
    return this.especialistaForm.get('especialidades') as FormArray;
  }

  private focusFirstInvalid(form: FormGroup) {
    const firstInvalid = Object.keys(form.controls).find((k) => form.get(k)?.invalid);
    if (firstInvalid) {
      const el = document.querySelector(
        `[formControlName="${firstInvalid}"]`
      ) as HTMLElement | null;
      el?.focus();
    }
  }

  agregarEspecialidadPredef(value: string) {
    const val = trimSpaces(value);
    if (!val) return;
    const pretty = titleCase(val);
    if (!this.especialidadesFA.value.includes(pretty)) {
      this.especialidadesFA.push(this.fb.control(pretty));
    }
  }

  agregarEspecialidadManual() {
    const val = trimSpaces(this.nuevaEspecialidad);
    if (!val) return;
    const pretty = titleCase(val);
    if (!this.especialidadesFA.value.includes(pretty)) {
      this.especialidadesFA.push(this.fb.control(pretty));
    }
    this.nuevaEspecialidad = '';
  }

  quitarEspecialidad(i: number) {
    this.especialidadesFA.removeAt(i);
  }

  private readPreview(file: File, setter: (dataUrl: string) => void) {
    const fr = new FileReader();
    fr.onload = () => setter(String(fr.result));
    fr.readAsDataURL(file);
  }

  onPacienteFileChange(which: 1 | 2, evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5MB.');
      return;
    }

    if (which === 1) {
      this.pacienteFile1 = file;
      this.readPreview(file, (url) => (this.pacientePreview1 = url));
      this.pacienteProg1 = 0;
    } else {
      this.pacienteFile2 = file;
      this.readPreview(file, (url) => (this.pacientePreview2 = url));
      this.pacienteProg2 = 0;
    }
  }

  onEspecialistaFileChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5MB.');
      return;
    }

    this.especialistaFile = file;
    this.readPreview(file, (url) => (this.especialistaPreview = url));
    this.especialistaProg = 0;
  }

  async registrar() {
    this.statusMsg = null;

    if (this.rolSeleccionado === 'paciente') {
      if (this.pacienteForm.invalid) {
        this.pacienteForm.markAllAsTouched();
        this.focusFirstInvalid(this.pacienteForm);
        return;
      }
      if (!this.pacienteFile1 || !this.pacienteFile2) {
        this.statusMsg = 'Debes subir las 2 imágenes del perfil.';
        return;
      }

      // Normalización
      const v = this.pacienteForm.value;
      const nombre = titleCase(v.nombre);
      const apellido = titleCase(v.apellido);
      const obra = titleCase(v.obraSocial);
      const dni = normalizeDni(v.dni);
      const displayName = `${nombre} ${apellido}`.trim();

      try {
        this.statusMsg = 'Creando usuario...';
        const uid = await this.auth.register({
          email: v.email.trim(),
          password: v.password,
          displayName,
          rol: 'paciente',
          extra: {
            nombre,
            apellido,
            edad: v.edad,
            dni,
            obraSocial: obra,
          },
        });

        // Compresión previa a la subida
        this.statusMsg = 'Preparando imágenes...';
        const c1 = await this.imgUtils.compressImage(this.pacienteFile1, 1024, 0.82, 'image/jpeg');
        const c2 = await this.imgUtils.compressImage(this.pacienteFile2, 1024, 0.82, 'image/jpeg');

        // ✅ Subida con AngularFire (evita CORS)
        this.statusMsg = 'Subiendo imágenes (1/2)...';
        const p1 = this.imgUtils.uploadToStorage(
          `usuarios/${uid}/perfil_1.jpg`,
          c1,
          (pct) => (this.pacienteProg1 = pct)
        );

        this.statusMsg = 'Subiendo imágenes (2/2)...';
        const p2 = this.imgUtils.uploadToStorage(
          `usuarios/${uid}/perfil_2.jpg`,
          c2,
          (pct) => (this.pacienteProg2 = pct)
        );

        const [url1, url2] = await Promise.all([p1, p2]);

        this.statusMsg = 'Guardando datos...';
        await this.usuarioService.setUsuario(uid, { fotoURL1: url1, fotoURL2: url2 });

        this.statusMsg = '¡Cuenta creada! Redirigiendo al login...';
        await this.router.navigate(['/login']);
      } catch (e: any) {
        console.error(e);
        this.statusMsg = 'Ocurrió un error durante el registro. Intentá nuevamente.';
      }
      return;
    }

    // ESPECIALISTA
    if (this.especialistaForm.invalid) {
      this.especialistaForm.markAllAsTouched();
      this.focusFirstInvalid(this.especialistaForm);
      return;
    }

    // Normalización
    const e = this.especialistaForm.value;
    const nombre = titleCase(e.nombre);
    const apellido = titleCase(e.apellido);
    const dni = normalizeDni(e.dni);
    const especialidades: string[] = Array.from(
      new Set((this.especialidadesFA.value as string[]).map(titleCase))
    );
    const displayName = `${nombre} ${apellido}`.trim();

    try {
      this.statusMsg = 'Creando usuario...';
      const uid = await this.auth.register({
        email: e.email.trim(),
        password: e.password,
        displayName,
        rol: 'especialista',
        extra: {
          nombre,
          apellido,
          edad: e.edad,
          dni,
          especialidades,
        },
      });

      if (this.especialistaFile) {
        this.statusMsg = 'Preparando imagen de perfil...';
        const comp = await this.imgUtils.compressImage(
          this.especialistaFile,
          1024,
          0.82,
          'image/jpeg'
        );

        this.statusMsg = 'Subiendo imagen...';
        const url = await this.imgUtils.uploadToStorage(
          `usuarios/${uid}/perfil.jpg`,
          comp,
          (pct) => (this.especialistaProg = pct)
        );
        await this.usuarioService.setUsuario(uid, { fotoURL: url });
      }

      this.statusMsg = '¡Cuenta creada! Redirigiendo al login...';
      await this.router.navigate(['/login']);
    } catch (e: any) {
      console.error(e);
      this.statusMsg = 'Ocurrió un error durante el registro. Intentá nuevamente.';
    }
  }

  irALogin() {
    this.router.navigate(['/login']);
  }
}
