// src/app/pages/admin/alta-usuario/alta-usuario.ts

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
  ValidatorFn,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminUserService, RolAlta } from '../../../services/admin-user.service';
import { ToastService } from '../../../shared/toast.service'; // <-- 1. IMPORTAR TOASTS

const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,}$/;
const DNI_PATTERN = /^\d{7,9}$/;

function atLeastOneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const arr = control as FormArray;
    const len = Array.isArray(arr?.value) ? arr.value.length : (arr as any)?.length ?? 0;
    return len > 0 ? null : { atLeastOne: true };
  };
}

@Component({
  selector: 'app-alta-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './alta-usuario.html',
  styleUrls: ['./alta-usuario.scss'],
})
export class AltaUsuarioComponent {
  private fb = inject(FormBuilder);
  private adminUser = inject(AdminUserService);
  private router = inject(Router);
  private toasts = inject(ToastService); // <-- 2. INYECTAR TOASTS

  rol: RolAlta = 'paciente';

  form: FormGroup = this.fb.group({
    rol: ['paciente', [Validators.required]],
    nombre: ['', [Validators.required, Validators.pattern(NAME_PATTERN)]],
    apellido: ['', [Validators.required, Validators.pattern(NAME_PATTERN)]],
    edad: [null, [Validators.required, Validators.min(0), Validators.max(120)]],
    dni: ['', [Validators.required, Validators.pattern(DNI_PATTERN)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    obraSocial: [''],
    especialidades: this.fb.array([], { validators: [atLeastOneValidator()] }),
  });

  pacienteImg1: File | null = null;
  pacienteImg2: File | null = null;
  especialistaImg: File | null = null;
  adminImg: File | null = null;

  get especialidadesFA(): FormArray {
    return this.form.get('especialidades') as FormArray;
  }

  onRolChange(value: string) {
    this.rol = value as RolAlta;
    this.form.get('rol')?.setValue(this.rol);
  }

  addEspecialidad(val: string) {
    const clean = (val || '').trim();
    if (!clean) return;
    const actuales: string[] = (this.especialidadesFA.value ?? []) as string[];
    if (!actuales.includes(clean)) {
      this.especialidadesFA.push(this.fb.control(clean));
    }
  }

  removeEspecialidad(i: number) {
    this.especialidadesFA.removeAt(i);
  }

  onFileChange(which: 'pac1' | 'pac2' | 'esp' | 'adm', evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      // FIX: Reemplazamos alert() por toasts.error()
      this.toasts.error('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      // FIX: Reemplazamos alert() por toasts.error()
      this.toasts.error('La imagen no puede superar los 5MB.');
      return;
    }
    if (which === 'pac1') this.pacienteImg1 = file;
    if (which === 'pac2') this.pacienteImg2 = file;
    if (which === 'esp') this.especialistaImg = file;
    if (which === 'adm') this.adminImg = file;
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const payload = {
      rol: this.rol,
      email: v.email,
      password: v.password,
      nombre: v.nombre,
      apellido: v.apellido,
      edad: v.edad,
      dni: v.dni,
      obraSocial: v.obraSocial,
      especialidades: (this.especialidadesFA.value ?? []) as string[],
      pacienteImg1: this.pacienteImg1,
      pacienteImg2: this.pacienteImg2,
      especialistaImg: this.especialistaImg,
      adminImg: this.adminImg,
    } as any;

    // FIX: Reemplazamos los alerts de validación por toasts.warning()
    if (this.rol === 'paciente' && (!this.pacienteImg1 || !this.pacienteImg2)) {
      this.toasts.warning('El paciente requiere 2 imágenes de perfil.');
      return;
    }
    if (this.rol === 'especialista' && !this.especialistaImg) {
      this.toasts.warning('El especialista requiere 1 imagen de perfil.');
      return;
    }
    if (this.rol === 'admin' && !this.adminImg) {
      this.toasts.warning('El administrador requiere 1 imagen de perfil.');
      return;
    }
    if (this.rol === 'especialista' && this.especialidadesFA.length === 0) {
      this.toasts.warning('Debés agregar al menos una especialidad.');
      return;
    }

    try {
      await this.adminUser.crearUsuarioComoAdmin(payload);
      // FIX: Reemplazamos alert() por toasts.success()
      this.toasts.success('Usuario creado. Se envió un email de verificación.');
      this.router.navigate(['/admin/usuarios']);
    } catch (e: any) {
      console.error(e);
      // FIX: Reemplazamos alert() por toasts.error()
      this.toasts.error(e?.message || 'No se pudo crear el usuario.');
    }
  }

  cancelar() {
    this.router.navigate(['/admin/usuarios']);
  }

  volver() {
    this.router.navigate(['/admin/usuarios']);
  }
}
