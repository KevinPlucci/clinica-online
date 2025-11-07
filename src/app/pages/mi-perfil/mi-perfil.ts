import {
  Component,
  inject,
  signal,
  effect,
  WritableSignal,
  runInInjectionContext,
  EnvironmentInjector,
} from '@angular/core';
import { CommonModule } from '@angular/common'; // Se quitó DatePipe
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

// Modelos y Servicios
import { Usuario, HorarioConfig } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';

// Tipo local para el formulario
type HorarioForm = WritableSignal<HorarioConfig>;

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], // Se quitó DatePipe
  templateUrl: './mi-perfil.html',
  styleUrls: ['./mi-perfil.scss'],
})
export class MiPerfilComponent {
  private auth = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);
  private env = inject(EnvironmentInjector);

  me = signal<Usuario | null>(null);
  cargando = signal<boolean>(true);
  editando = signal<boolean>(false);
  mensaje = signal<string | null>(null);

  // Días de la semana para el <select>
  diasSemana = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    // Domingo no se incluye a propósito
  ];

  // Estructura de datos para el formulario
  // Usamos Map para mantener el orden y facilitar la manipulación
  horariosMap: Map<string, HorarioConfig[]> = new Map();

  constructor() {
    this.cargarDatosUsuario();
  }

  async cargarDatosUsuario() {
    this.cargando.set(true);
    // Tomamos el primer valor del observable me$
    const user = await firstValueFrom(this.auth.me$);
    if (user) {
      this.me.set(user);
      // Si es especialista, preparamos el formulario de horarios
      if (user.rol === 'especialista' && user.especialidades) {
        this.inicializarHorariosMap(user);
      }
    }
    this.cargando.set(false);
  }

  /**
   * Carga el Map de horarios desde el objeto 'disponibilidad' del usuario
   */
  inicializarHorariosMap(user: Usuario) {
    this.horariosMap.clear();
    const dispo = user.disponibilidad || {};

    // Aseguramos que cada especialidad tenga una entrada
    (user.especialidades || []).forEach((esp) => {
      // Usamos JSON.parse/stringify para crear copias profundas y evitar mutaciones
      const horariosGuardados = dispo[esp] ? JSON.parse(JSON.stringify(dispo[esp])) : [];
      this.horariosMap.set(esp, horariosGuardados);
    });
  }

  // --- Funciones del Editor de Horarios ---

  addHorario(especialidad: string) {
    const horarios = this.horariosMap.get(especialidad);
    if (horarios) {
      // Agrega un nuevo horario por defecto (Lunes 09:00 a 17:00)
      horarios.push({
        dia: 1, // Lunes
        desde: '09:00',
        hasta: '17:00',
      });
    }
  }

  removeHorario(especialidad: string, index: number) {
    const horarios = this.horariosMap.get(especialidad);
    if (horarios) {
      horarios.splice(index, 1);
    }
  }

  async guardarHorarios() {
    const user = this.me();
    if (!user || user.rol !== 'especialista') return;

    this.cargando.set(true);
    this.mensaje.set(null);

    try {
      // Guardamos el Map en el servicio (el servicio lo convertirá a objeto)
      await this.usuarioService.guardarHorariosDisponibles(user.uid, this.horariosMap);
      this.mensaje.set('¡Horarios guardados con éxito!');
      this.editando.set(false);
    } catch (e) {
      console.error(e);
      this.mensaje.set('Error al guardar los horarios.');
    } finally {
      this.cargando.set(false);
    }
  }

  cancelarEdicion() {
    this.editando.set(false);
    this.mensaje.set(null);
    // Recargamos los datos originales para descartar cambios
    this.inicializarHorariosMap(this.me()!);
  }

  // Helper para que ngFor funcione bien con Map
  // (Aunque en el HTML lo convertiremos a array)
  getHorariosArray(especialidad: string): HorarioConfig[] {
    return this.horariosMap.get(especialidad) || [];
  }
}
