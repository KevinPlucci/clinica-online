import {
  Component,
  inject,
  computed,
  signal,
  effect,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, map, of, startWith, firstValueFrom } from 'rxjs';
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
  imports: [CommonModule, FormsModule, DatePipe, TitleCasePipe, UpperCasePipe],
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

  // Listas
  especialistas$!: Observable<Usuario[]>;
  pacientes$!: Observable<Usuario[]>;
  // Ya no necesitamos la lista global de especialidades al inicio

  // --- Estado del Asistente ---
  paso = signal<1 | 2 | 3 | 4>(1); // 1: Profesional, 2: Especialidad, 3: Día, 4: Horario
  cargando = signal<boolean>(true);
  error = signal<string | null>(null);

  // --- Selecciones del Turno ---
  pacienteSelId = signal<string | null>(null); // Solo para el Admin
  especialistaSel = signal<Usuario | null>(null);
  especialidadSel = signal<string | null>(null);
  diaSel = signal<Date | null>(null);
  horarioSel = signal<HorarioSlot | null>(null);

  // --- Listas Filtradas para el Template ---
  especialidadesDelProfesional = signal<string[]>([]);
  diasDisponibles = signal<Date[]>([]);
  horariosDisponibles = signal<HorarioSlot[]>([]);

  private turnosOcupados = signal<Set<number>>(new Set());

  // Imágenes por defecto para especialidades (puedes agregar más)
  imagenesEspecialidad: { [key: string]: string } = {
    Traumatología: 'assets/especialidades/traumatologia.png',
    Cardiología: 'assets/especialidades/cardiologia.png',
    Pediatría: 'assets/especialidades/pediatria.png',
    // ... otras
    default: 'assets/especialidades/default.png',
  };

  constructor() {
    this.cargarDatosIniciales();

    // 1. Detectar Admin y auto-seleccionar paciente si no lo es
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

    // 2. Cuando cambia el especialista, cargar sus especialidades y sus turnos
    effect(() => {
      runInInjectionContext(this.env, () => {
        const esp = this.especialistaSel();
        if (!esp) {
          this.especialidadesDelProfesional.set([]);
          this.turnosOcupados.set(new Set());
          return;
        }

        // Cargar especialidades del profesional elegido
        this.especialidadesDelProfesional.set(esp.especialidades || []);

        // Cargar sus turnos ocupados (para usarlos más adelante)
        this.cargando.set(true);
        this.turnoService.getTurnosParaEspecialista(esp.uid).subscribe((turnos) => {
          const turnosActivos = turnos.filter(
            (t) => t.estado !== 'cancelado' && t.estado !== 'rechazado'
          );
          const ocupados = new Set(turnosActivos.map((t) => t.fecha.toDate().getTime()));
          this.turnosOcupados.set(ocupados);
          this.cargando.set(false);

          // Si ya estábamos en el paso de horarios, regenerarlos
          if (this.diaSel()) {
            this.seleccionarDia(this.diaSel()!);
          }
        });
      });
    });

    // 3. Cuando cambia la especialidad, generar los días disponibles
    effect(() => {
      const esp = this.especialistaSel();
      const especialidad = this.especialidadSel();
      if (!esp || !especialidad) {
        this.diasDisponibles.set([]);
        return;
      }
      this.diasDisponibles.set(this.generarProximos15Dias(esp, especialidad));
    });
  }

  cargarDatosIniciales() {
    this.cargando.set(true);
    const todosUsuarios$ = runInInjectionContext(this.env, () => this.usuarioService.usuarios$());

    this.especialistas$ = todosUsuarios$.pipe(
      map((usuarios) => usuarios.filter((u) => u.rol === 'especialista' && u.habilitado))
    );

    this.pacientes$ = todosUsuarios$.pipe(
      map((usuarios) => usuarios.filter((u) => u.rol === 'paciente'))
    );

    // Combinamos para saber cuándo terminó de cargar todo
    combineLatest([this.especialistas$, this.pacientes$, this.me$]).subscribe(() =>
      this.cargando.set(false)
    );
  }

  // --- Helper para imágenes de especialidad ---
  getImagenEspecialidad(especialidad: string): string {
    // Intenta buscar la imagen específica, sino usa la default
    // Podrías usar un servicio o una lógica más compleja aquí si los nombres varían mucho
    return (
      this.imagenesEspecialidad[especialidad] ||
      'https://placehold.co/100x60/e2e8f0/1e3a8a?text=' + especialidad.substring(0, 3).toUpperCase()
    );
  }

  // --- Pasos de Selección ---

  seleccionarEspecialista(especialista: Usuario) {
    this.especialistaSel.set(especialista);
    this.especialidadSel.set(null);
    this.diaSel.set(null);
    this.horarioSel.set(null);
    this.paso.set(2); // Ir a elegir especialidad
  }

  seleccionarEspecialidad(especialidad: string) {
    this.especialidadSel.set(especialidad);
    this.diaSel.set(null);
    this.horarioSel.set(null);
    this.paso.set(3); // Ir a elegir día
  }

  seleccionarDia(dia: Date) {
    this.diaSel.set(dia);
    this.horarioSel.set(null);
    // Generar horarios para este día
    this.horariosDisponibles.set(this.generarHorariosParaDia(dia));
    this.paso.set(4); // Ir a elegir horario (aunque se muestran en la misma pantalla a veces, conceptualmente es el paso 4)
  }

  seleccionarHorario(slot: HorarioSlot) {
    if (slot.ocupado) return;
    this.horarioSel.set(slot);
    // No avanzamos de paso automáticamente, el usuario debe confirmar
  }

  // --- Generación de Fechas/Horas ---

  private generarProximos15Dias(especialista: Usuario, especialidad: string): Date[] {
    if (!especialista.disponibilidad) return [];

    const horariosEspecialidad = especialista.disponibilidad[especialidad];
    if (!horariosEspecialidad || horariosEspecialidad.length === 0) return [];

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
    if (!especialista || !especialidad || !especialista.disponibilidad) return [];

    const horarios: HorarioSlot[] = [];
    const diaSemana = dia.getDay();
    const ocupados = this.turnosOcupados();

    const reglas = especialista.disponibilidad[especialidad].filter((r) => r.dia === diaSemana);

    reglas.forEach((regla) => {
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
      !!this.especialistaSel() &&
      !!this.especialidadSel() &&
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

      // Validación de turno duplicado en el mismo día/especialidad
      const turnosPaciente = await firstValueFrom(
        runInInjectionContext(this.env, () => this.turnoService.getTurnosParaPaciente(pacienteId))
      );

      const yaTieneTurno = turnosPaciente.some((t) => {
        if (t.especialidad !== especialidad) return false;
        if (t.estado === 'cancelado' || t.estado === 'rechazado') return false;
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
        return;
      }

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
    // Lógica de retroceso
    switch (this.paso()) {
      case 2: // Estaba en Especialidad -> vuelve a Profesional (Paso 1)
        this.paso.set(1);
        this.especialistaSel.set(null);
        break;
      case 3: // Estaba en Día -> vuelve a Especialidad (Paso 2)
        this.paso.set(2);
        this.especialidadSel.set(null);
        break;
      case 4: // Estaba en Horario -> vuelve a Día (Paso 3)
        this.paso.set(3);
        this.diaSel.set(null);
        this.horarioSel.set(null);
        break;
    }
  }

  // Helpers para el template
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
