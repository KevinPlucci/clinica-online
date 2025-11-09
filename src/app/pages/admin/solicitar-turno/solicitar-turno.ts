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
import { Usuario, HorarioConfig } from '../../../models/usuario';
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
  paso = signal<1 | 2 | 3>(1);
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  // --- Selecciones del Turno ---
  especialidadSel = signal<string | null>(null);
  especialistaSel = signal<Usuario | null>(null);
  pacienteSelId = signal<string | null>(null);
  diaSel = signal<Date | null>(null);
  horarioSel = signal<HorarioSlot | null>(null);

  // --- Listas Filtradas ---
  especialistasFiltrados = signal<Usuario[]>([]);
  diasDisponibles = signal<Date[]>([]);
  horariosDisponibles = signal<HorarioSlot[]>([]);

  private turnosOcupados = signal<Set<number>>(new Set());

  constructor() {
    this.cargarDatosIniciales();

    // 1. Detectar Admin
    effect(() => {
      runInInjectionContext(this.env, () => {
        this.me$.subscribe((user) => {
          if (!user) return;
          const esAdmin = user.rol === 'admin';
          this.isAdmin.set(esAdmin);
          if (!esAdmin) {
            this.pacienteSelId.set(user.uid);
          }
          this.cargando.set(false);
        });
      });
    });

    // 2. Filtrar especialistas por especialidad
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

    // 3. Cargar disponibilidad y turnos ocupados del especialista
    effect(() => {
      runInInjectionContext(this.env, () => {
        const esp = this.especialistaSel();
        if (!esp) {
          this.diasDisponibles.set([]);
          this.turnosOcupados.set(new Set());
          return;
        }

        this.diasDisponibles.set(this.generarProximos15Dias(esp));

        this.cargando.set(true);
        this.turnoService.getTurnosParaEspecialista(esp.uid).subscribe((turnos) => {
          // Filtramos solo los que NO están cancelados o rechazados para que ocupen lugar
          const turnosActivos = turnos.filter(
            (t) => t.estado !== 'cancelado' && t.estado !== 'rechazado'
          );
          const ocupados = new Set(turnosActivos.map((t) => t.fecha.toDate().getTime()));
          this.turnosOcupados.set(ocupados);
          this.cargando.set(false);
          if (this.diaSel()) {
            this.seleccionarDia(this.diaSel()!);
          }
        });
      });
    });
  }

  cargarDatosIniciales() {
    this.cargando.set(true);
    const todosUsuarios$ = runInInjectionContext(this.env, () => this.usuarioService.usuarios$());

    this.especialistas$ = todosUsuarios$.pipe(
      map((usuarios) => usuarios.filter((u) => u.rol === 'especialista'))
    );

    this.pacientes$ = todosUsuarios$.pipe(
      map((usuarios) => usuarios.filter((u) => u.rol === 'paciente'))
    );

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

    combineLatest([this.especialistas$, this.pacientes$, this.especialidades$, this.me$]).subscribe(
      ([especialistas, pacientes, especialidades, me]) => {
        if (me && me.rol !== 'admin') {
          this.pacienteSelId.set(me.uid);
        }
        this.cargando.set(false);
      }
    );
  }

  // --- Pasos ---

  seleccionarEspecialidad(especialidad: string) {
    this.especialidadSel.set(especialidad);
    this.especialistaSel.set(null);
    this.diaSel.set(null);
    this.horarioSel.set(null);
    this.paso.set(2);
  }

  seleccionarEspecialista(especialista: Usuario) {
    this.especialistaSel.set(especialista);
    this.diaSel.set(null);
    this.horarioSel.set(null);
    this.paso.set(3);
  }

  seleccionarDia(dia: Date) {
    this.diaSel.set(dia);
    this.horarioSel.set(null);
    this.cargando.set(true);
    this.horariosDisponibles.set(this.generarHorariosParaDia(dia));
    this.cargando.set(false);
  }

  seleccionarHorario(slot: HorarioSlot) {
    if (slot.ocupado) return;
    this.horarioSel.set(slot);
  }

  // --- Generación de Horarios ---

  private generarProximos15Dias(especialista: Usuario | null): Date[] {
    if (!especialista || !especialista.disponibilidad || !this.especialidadSel()) {
      return [];
    }

    const horariosEspecialidad = especialista.disponibilidad[this.especialidadSel()!];
    if (!horariosEspecialidad || horariosEspecialidad.length === 0) {
      return [];
    }

    const diasQueTrabaja = new Set(horariosEspecialidad.map((h) => h.dia));
    const dias: Date[] = [];
    let hoy = new Date();
    hoy.setDate(hoy.getDate() + 1);

    for (let i = 0; i < 30 && dias.length < 15; i++) {
      const diaSemana = hoy.getDay();
      if (diasQueTrabaja.has(diaSemana)) {
        dias.push(new Date(hoy));
      }
      hoy.setDate(hoy.getDate() + 1);
    }
    return dias;
  }

  private generarHorariosParaDia(dia: Date): HorarioSlot[] {
    const especialista = this.especialistaSel();
    const especialidad = this.especialidadSel();
    if (!especialista || !especialidad || !especialista.disponibilidad) {
      return [];
    }

    const horarios: HorarioSlot[] = [];
    const diaSemana = dia.getDay();
    const ocupados = this.turnosOcupados();

    const reglasEspecialidad = especialista.disponibilidad[especialidad] || [];
    const reglasDelDia = reglasEspecialidad.filter((r) => r.dia === diaSemana);

    reglasDelDia.forEach((regla) => {
      const [startHour, startMin] = regla.desde.split(':').map(Number);
      const [endHour, endMin] = regla.hasta.split(':').map(Number);

      let slotDate = new Date(dia);
      slotDate.setHours(startHour, startMin, 0, 0);

      let endDate = new Date(dia);
      endDate.setHours(endHour, endMin, 0, 0);

      while (slotDate < endDate) {
        const fechaSlot = new Date(slotDate);
        horarios.push({
          fecha: fechaSlot,
          ocupado: ocupados.has(fechaSlot.getTime()),
        });
        slotDate.setMinutes(slotDate.getMinutes() + 30);
      }
    });

    return horarios.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }

  // --- Confirmación ---

  get puedeConfirmar(): boolean {
    return (
      !!this.especialidadSel() &&
      !!this.especialistaSel() &&
      !!this.pacienteSelId() &&
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
      const especialidad = this.especialidadSel()!;
      const fechaTurno = this.horarioSel()!.fecha;

      // +++ INICIO VALIDACIÓN (Mismo día, misma especialidad) +++
      // 1. Obtenemos los turnos del paciente
      const turnosPaciente = await firstValueFrom(
        runInInjectionContext(this.env, () => this.turnoService.getTurnosParaPaciente(pacienteId))
      );

      // 2. Revisamos si alguno coincide en fecha y especialidad
      const yaTieneTurno = turnosPaciente.some((t) => {
        // Debe ser la misma especialidad
        if (t.especialidad !== especialidad) return false;
        // El turno debe estar activo (no cancelado/rechazado)
        if (t.estado === 'cancelado' || t.estado === 'rechazado') return false;

        // Debe ser el mismo día (ignoramos la hora)
        const tFecha = t.fecha.toDate();
        return (
          tFecha.getDate() === fechaTurno.getDate() &&
          tFecha.getMonth() === fechaTurno.getMonth() &&
          tFecha.getFullYear() === fechaTurno.getFullYear()
        );
      });

      if (yaTieneTurno) {
        this.error.set('Ya tenés un turno reservado para esta especialidad en este día.');
        this.cargando.set(false);
        return; // Detenemos la creación del turno
      }
      // +++ FIN VALIDACIÓN +++

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
        especialidad: especialidad,
        fecha: Timestamp.fromDate(fechaTurno),
        estado: 'solicitado',
        pacienteNombre: pacienteNombre,
        especialistaNombre: `${especialista.nombre} ${especialista.apellido}`,
      };

      await this.turnoService.crearTurno(nuevoTurno);
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
