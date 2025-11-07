import {
  Component,
  inject,
  computed,
  signal,
  effect,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, map, of, startWith, switchMap, firstValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

// Modelos y Servicios
import { Usuario, HorarioConfig } from '../../../models/usuario'; // +++ Importar HorarioConfig +++
import { Turno } from '../../../models/turno';
import { AuthService } from '../../../services/auth.service';
import { UsuarioService } from '../../../services/usuario.service';
import { TurnoService } from '../../../services/turno.service';

// Tipo local para el slot de horario
interface HorarioSlot {
  fecha: Date; // Objeto Date completo
  ocupado: boolean;
}

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TitleCasePipe],
  templateUrl: './solicitar-turno.html',
  styleUrls: ['./solicitar-turno.scss'],
})
export class SolicitarTurnoComponent {
  private auth = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private turnoService = inject(TurnoService);
  private router = inject(Router);
  private env = inject(EnvironmentInjector);

  // --- Datos del Usuario y Listas ---
  me$: Observable<Usuario | null> = this.auth.me$;
  isAdmin = signal<boolean>(false);

  // Listas de usuarios (para admin y para selección)
  especialistas$!: Observable<Usuario[]>;
  pacientes$!: Observable<Usuario[]>;
  especialidades$!: Observable<string[]>;

  // --- Estado del Asistente ---
  paso = signal<1 | 2 | 3>(1); // 1: Especialidad, 2: Especialista, 3: Fecha/Hora
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  // --- Selecciones del Turno ---
  especialidadSel = signal<string | null>(null);
  especialistaSel = signal<Usuario | null>(null);
  pacienteSelId = signal<string | null>(null); // Solo para el Admin
  diaSel = signal<Date | null>(null);
  horarioSel = signal<HorarioSlot | null>(null);

  // --- Listas Filtradas para el Template ---
  especialistasFiltrados = signal<Usuario[]>([]);
  diasDisponibles = signal<Date[]>([]);
  horariosDisponibles = signal<HorarioSlot[]>([]);

  // Turnos existentes del especialista (para verificar disponibilidad)
  private turnosEspecialista$!: Observable<Turno[]>;
  private turnosOcupados = signal<Set<number>>(new Set());

  constructor() {
    this.cargarDatosIniciales();

    // --- EFFECT: Reaccionar a cambios de selección ---

    // 1. Cuando cambia el usuario (me$), determinar si es admin
    effect(() => {
      runInInjectionContext(this.env, () => {
        this.me$.subscribe((user) => {
          if (!user) return;
          const esAdmin = user.rol === 'admin';
          this.isAdmin.set(esAdmin);
          // Si NO es admin, auto-seleccionarse como paciente
          if (!esAdmin) {
            this.pacienteSelId.set(user.uid);
          }
          this.cargando.set(false);
        });
      });
    });

    // 2. Cuando cambia la especialidad seleccionada, filtrar la lista de especialistas
    effect(() => {
      runInInjectionContext(this.env, () => {
        const esp = this.especialidadSel();
        if (!esp) {
          this.especialistasFiltrados.set([]);
          return;
        }
        this.cargando.set(true);
        this.especialistas$.subscribe((todos) => {
          const filtrados = todos.filter(
            (e) => (e.especialidades as string[])?.includes(esp) && e.habilitado
          );
          this.especialistasFiltrados.set(filtrados);
          this.cargando.set(false);
        });
      });
    });

    // 3. Cuando cambia el especialista, generar los días y cargar sus turnos
    effect(() => {
      runInInjectionContext(this.env, () => {
        const esp = this.especialistaSel();
        if (!esp) {
          this.diasDisponibles.set([]);
          this.turnosOcupados.set(new Set());
          return;
        }

        // +++ INICIO MODIFICACIÓN (Horarios Dinámicos) +++
        // Generar los próximos 15 días basándose en la DISPONIBILIDAD
        this.diasDisponibles.set(this.generarProximos15Dias(esp));
        // +++ FIN MODIFICACIÓN +++

        // Cargar los turnos existentes de este especialista
        this.cargando.set(true);
        this.turnosEspecialista$ = this.turnoService.getTurnosParaEspecialista(esp.uid);
        this.turnosEspecialista$.subscribe((turnos) => {
          const ocupados = new Set(turnos.map((t) => t.fecha.toDate().getTime()));
          this.turnosOcupados.set(ocupados);
          this.cargando.set(false);
          // Forzar la regeneración de horarios si ya había un día seleccionado
          if (this.diaSel()) {
            this.seleccionarDia(this.diaSel()!);
          }
        });
      });
    });
  }

  /**
   * Carga las listas iniciales de especialistas, pacientes y especialidades.
   */
  cargarDatosIniciales() {
    this.cargando.set(true);
    // Usamos el servicio de usuarios para traerlos a todos
    const todosUsuarios$ = runInInjectionContext(this.env, () => this.usuarioService.usuarios$());

    // Filtramos especialistas
    this.especialistas$ = todosUsuarios$.pipe(
      map((usuarios) => usuarios.filter((u) => u.rol === 'especialista'))
    );

    // Filtramos pacientes (solo necesario si es admin)
    this.pacientes$ = todosUsuarios$.pipe(
      map((usuarios) => usuarios.filter((u) => u.rol === 'paciente'))
    );

    // Creamos la lista única de especialidades
    this.especialidades$ = this.especialistas$.pipe(
      map((especialistas) => {
        const set = new Set<string>();
        especialistas.forEach((e) => {
          (e.especialidades as string[])?.forEach((esp) => set.add(esp));
        });
        return Array.from(set).sort();
      }),
      startWith([])
    );

    // Combinamos todo para asegurarnos de que esté cargado
    combineLatest([this.especialistas$, this.pacientes$, this.especialidades$, this.me$]).subscribe(
      ([especialistas, pacientes, especialidades, me]) => {
        if (me && me.rol !== 'admin') {
          this.pacienteSelId.set(me.uid);
        }
        this.cargando.set(false);
      }
    );
  }

  // --- Lógica de Selección (Pasos) ---

  seleccionarEspecialidad(especialidad: string) {
    this.especialidadSel.set(especialidad);
    this.especialistaSel.set(null); // Resetea
    this.diaSel.set(null);
    this.horarioSel.set(null);
    this.paso.set(2);
  }

  seleccionarEspecialista(especialista: Usuario) {
    this.especialistaSel.set(especialista);
    this.diaSel.set(null); // Resetea
    this.horarioSel.set(null);
    this.paso.set(3);
  }

  seleccionarDia(dia: Date) {
    this.diaSel.set(dia);
    this.horarioSel.set(null); // Resetea
    // Generar los horarios para este día
    this.cargando.set(true);
    this.horariosDisponibles.set(this.generarHorariosParaDia(dia));
    this.cargando.set(false);
  }

  seleccionarHorario(slot: HorarioSlot) {
    if (slot.ocupado) return;
    this.horarioSel.set(slot);
  }

  // --- Lógica de Generación de Fechas/Horas ---

  /**
   * Genera los próximos 15 días en los que el especialista TRABAJA.
   */
  private generarProximos15Dias(especialista: Usuario | null): Date[] {
    if (!especialista || !especialista.disponibilidad || !this.especialidadSel()) {
      return [];
    }

    // Buscamos los horarios para la especialidad seleccionada
    const horariosEspecialidad = especialista.disponibilidad[this.especialidadSel()!];
    if (!horariosEspecialidad || horariosEspecialidad.length === 0) {
      return []; // Este especialista no cargó horarios para esta especialidad
    }

    // Creamos un Set con los días de la semana que trabaja (1=Lunes, 6=Sábado)
    const diasQueTrabaja = new Set(horariosEspecialidad.map((h) => h.dia));

    const dias: Date[] = [];
    let hoy = new Date();
    // Empezamos desde mañana
    hoy.setDate(hoy.getDate() + 1);

    // Iteramos los próximos 30 días para encontrar 15 días hábiles
    for (let i = 0; i < 30 && dias.length < 15; i++) {
      const diaSemana = hoy.getDay(); // 0 = Domingo

      // Si el día de la semana (ej: 1=Lunes) está en el Set de días que trabaja
      if (diasQueTrabaja.has(diaSemana)) {
        dias.push(new Date(hoy));
      }
      hoy.setDate(hoy.getDate() + 1);
    }
    return dias;
  }

  /**
   * Genera los slots de horarios basándose en la disponibilidad
   * guardada por el especialista.
   */
  private generarHorariosParaDia(dia: Date): HorarioSlot[] {
    const especialista = this.especialistaSel();
    const especialidad = this.especialidadSel();
    if (!especialista || !especialidad || !especialista.disponibilidad) {
      return [];
    }

    const horarios: HorarioSlot[] = [];
    const diaSemana = dia.getDay(); // 0=Dom, 6=Sáb
    const ocupados = this.turnosOcupados();

    // 1. Obtener las reglas para esta especialidad
    const reglasEspecialidad = especialista.disponibilidad[especialidad] || [];

    // 2. Filtrar las reglas para el día seleccionado (ej: todas las reglas para el Lunes)
    const reglasDelDia = reglasEspecialidad.filter((r) => r.dia === diaSemana);
    if (reglasDelDia.length === 0) {
      return []; // No trabaja este día en esta especialidad
    }

    // 3. Iterar por cada regla (ej: turno mañana y turno tarde)
    reglasDelDia.forEach((regla) => {
      const [startHour, startMin] = regla.desde.split(':').map(Number);
      const [endHour, endMin] = regla.hasta.split(':').map(Number);

      let slotDate = new Date(dia);
      slotDate.setHours(startHour, startMin, 0, 0);

      let endDate = new Date(dia);
      endDate.setHours(endHour, endMin, 0, 0);

      // 4. Generar slots cada 30 minutos dentro del rango
      while (slotDate < endDate) {
        const fechaSlot = new Date(slotDate);
        horarios.push({
          fecha: fechaSlot,
          ocupado: ocupados.has(fechaSlot.getTime()),
        });
        // Incrementar 30 minutos
        slotDate.setMinutes(slotDate.getMinutes() + 30);
      }
    });

    return horarios;
  }

  // --- Confirmación y Navegación ---

  get puedeConfirmar(): boolean {
    return (
      !!this.especialidadSel() &&
      !!this.especialistaSel() &&
      !!this.pacienteSelId() && // Admin o paciente ya lo tienen
      !!this.diaSel() &&
      !!this.horarioSel() &&
      !this.horarioSel()?.ocupado
    );
  }

  async confirmarTurno() {
    if (!this.puedeConfirmar || this.cargando()) return;

    this.cargando.set(true);
    this.error.set(null);

    try {
      const pacienteId = this.pacienteSelId()!;
      const especialista = this.especialistaSel()!;

      // Si es admin, necesitamos buscar el nombre del paciente
      let pacienteNombre = 'Paciente';
      if (this.isAdmin()) {
        const pacientes = await firstValueFrom(this.pacientes$);
        const p = pacientes?.find((p: Usuario) => p.uid === pacienteId);
        pacienteNombre = p ? `${p.nombre} ${p.apellido}` : 'Paciente';
      } else {
        const me = await firstValueFrom(this.me$);
        pacienteNombre = me ? `${me.nombre} ${me.apellido}` : 'Paciente';
      }

      const nuevoTurno: Omit<Turno, 'id'> = {
        pacienteId: pacienteId,
        especialistaId: especialista.uid,
        especialidad: this.especialidadSel()!,
        fecha: Timestamp.fromDate(this.horarioSel()!.fecha),
        estado: 'solicitado',
        pacienteNombre: pacienteNombre,
        especialistaNombre: `${especialista.nombre} ${especialista.apellido}`,
      };

      await this.turnoService.crearTurno(nuevoTurno);

      // ¡Éxito! Redirigir a "Mis Turnos"
      this.router.navigate(['/mis-turnos']);
    } catch (err: any) {
      console.error(err);
      this.error.set('Error al crear el turno. Por favor, intentá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  volver(paso: number | 'inicio') {
    if (paso === 'inicio') {
      this.router.navigate(['/bienvenida']);
      return;
    }
    if (paso === 1) {
      this.paso.set(1);
      this.especialistaSel.set(null);
    }
    if (paso === 2) {
      this.paso.set(2);
      this.diaSel.set(null);
      this.horarioSel.set(null);
    }
  }

  // Funciones para obtener nombres y evitar lógica compleja en HTML
  getPacienteNombre(pacientes: Usuario[] | null, uid: string | null): string {
    if (!pacientes || !uid) return '...';
    const p = pacientes.find((p: Usuario) => p.uid === uid);
    return p ? `${p.nombre} ${p.apellido}` : 'Paciente no encontrado';
  }

  getEspecialistaNombre(): string {
    const esp = this.especialistaSel();
    return esp ? `${esp.nombre} ${esp.apellido}` : '...';
  }
}
