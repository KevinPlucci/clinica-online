import { Component, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // FormsModule es necesario para [(ngModel)]
import { Observable, BehaviorSubject, switchMap, of } from 'rxjs';

// Servicios y Modelos
import { AuthService } from '../../services/auth.service';
import { TurnoService } from '../../services/turno.service';
import { Usuario } from '../../models/usuario';
// +++ CAMBIO: Importamos las nuevas interfaces +++
import { Turno, HistoriaClinica, DatoDinamico } from '../../models/turno';

// Pipes
import { FiltroTurnosPipe } from '../../pipes/filtro-turnos.pipe';

// +++ CAMBIO: 'finalizar' ahora usa el form de H.C. +++
type ModalContexto = 'cancelar' | 'rechazar' | 'finalizar' | 'calificar' | 'encuesta' | 'verReseña';

// +++ NUEVO: Valor inicial para el formulario de H.C. +++
const HISTORIA_VACIA: HistoriaClinica = {
  altura: 0,
  peso: 0,
  temperatura: 0,
  presion: '',
  datosDinamicos: [],
};

@Component({
  selector: 'app-mis-turnos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FiltroTurnosPipe],
  templateUrl: './mis-turnos.html',
  styleUrls: ['./mis-turnos.scss'],
})
export class MisTurnosComponent {
  private auth = inject(AuthService);
  private turnoService = inject(TurnoService);
  private router = inject(Router);
  private env = inject(EnvironmentInjector);

  me$: Observable<Usuario | null> = this.auth.me$;
  turnos$: Observable<Turno[]>;

  filtro$ = new BehaviorSubject<string>('');
  filtroInput = '';

  // Estado del Modal
  modalVisible = false;
  modalContexto: ModalContexto | null = null;
  turnoSeleccionado: Turno | null = null;
  comentarioModal = '';
  errorModal = '';

  // +++ NUEVO: Estado para el formulario de Historia Clínica +++
  // Hacemos una copia profunda para evitar mutaciones
  historiaForm: HistoriaClinica = JSON.parse(JSON.stringify(HISTORIA_VACIA));

  constructor() {
    this.turnos$ = this.auth.me$.pipe(
      switchMap((user) => {
        if (!user) return of([]);
        return runInInjectionContext(this.env, () => {
          if (user.rol === 'paciente') {
            return this.turnoService.getTurnosParaPaciente$(user.uid);
          }
          if (user.rol === 'especialista') {
            return this.turnoService.getTurnosParaEspecialista$(user.uid);
          }
          return of([]);
        });
      })
    );
  }

  // --- Manejo del Filtro ---
  actualizarFiltro() {
    this.filtro$.next(this.filtroInput);
  }
  limpiarFiltro() {
    this.filtroInput = '';
    this.actualizarFiltro();
  }

  getVolverLink(rol: Usuario['rol']): string {
    switch (rol) {
      case 'paciente':
        return '/paciente/turnos';
      case 'especialista':
        return '/especialista/agenda';
      default:
        return '/bienvenida';
    }
  }

  // --- Lógica del Modal ---

  abrirModal(contexto: ModalContexto, turno: Turno) {
    this.modalContexto = contexto;
    this.turnoSeleccionado = turno;
    this.comentarioModal = '';
    this.errorModal = '';

    // +++ NUEVO: Si abrimos el modal 'finalizar', reseteamos el form de H.C. +++
    if (contexto === 'finalizar') {
      this.resetHistoriaForm();
    }

    // Si es "verReseña", precargamos el comentario (para cancelaciones, etc.)
    // La H.C. se leerá directamente de 'turnoSeleccionado' en el HTML
    if (contexto === 'verReseña') {
      this.comentarioModal = turno.comentario || turno.motivoCancelacion || 'No hay reseña.';
    }

    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.modalContexto = null;
    this.turnoSeleccionado = null;
  }

  async confirmarModal() {
    if (!this.turnoSeleccionado) return;
    const id = this.turnoSeleccionado.id;
    const comentario = this.comentarioModal.trim();

    // +++ NUEVO: Lógica de confirmación para 'finalizar' (Guardar H.C.) +++
    if (this.modalContexto === 'finalizar') {
      if (this.validarHistoriaClinica()) {
        try {
          // Filtramos datos dinámicos vacíos
          const hcLimpia = {
            ...this.historiaForm,
            datosDinamicos: this.historiaForm.datosDinamicos.filter(
              (d) => d.clave.trim() !== '' && d.valor.trim() !== ''
            ),
          };
          await this.turnoService.finalizarTurno(id, hcLimpia);
          this.cerrarModal();
        } catch (e) {
          console.error(e);
          this.errorModal = 'Ocurrió un error al guardar la Historia Clínica.';
        }
      }
      return; // Detenemos la ejecución aquí
    }

    // --- Lógica anterior (para otros modales) ---

    // Validamos comentario (excepto para 'verReseña' y 'finalizar')
    if (this.modalContexto !== 'verReseña' && !comentario) {
      this.errorModal = 'Por favor, dejá un comentario para continuar.';
      return;
    }

    this.errorModal = '';

    try {
      switch (this.modalContexto) {
        case 'cancelar':
          await this.turnoService.cancelarTurno(id, comentario);
          break;
        case 'rechazar':
          await this.turnoService.rechazarTurno(id, comentario);
          break;
        case 'calificar':
          await this.turnoService.calificarAtencion(id, comentario);
          break;
        case 'encuesta':
          await this.turnoService.completarEncuesta(id, { respuesta: comentario });
          break;
      }
      this.cerrarModal();
    } catch (e) {
      console.error(e);
      this.errorModal = 'Ocurrió un error al procesar la solicitud.';
    }
  }

  // --- Acciones Directas (sin modal) ---

  async aceptarTurno(id: string) {
    try {
      await this.turnoService.aceptarTurno(id);
    } catch (e) {
      console.error(e);
      alert('Error al aceptar el turno.');
    }
  }

  // --- +++ NUEVOS Métodos para Formulario H.C. +++ ---

  private resetHistoriaForm() {
    // Copia profunda para resetear
    this.historiaForm = JSON.parse(JSON.stringify(HISTORIA_VACIA));
  }

  private validarHistoriaClinica(): boolean {
    const { altura, peso, temperatura, presion } = this.historiaForm;
    if (!altura || !peso || !temperatura || !presion.trim()) {
      this.errorModal = 'Por favor, completá los 4 campos fijos (altura, peso, temp y presión).';
      return false;
    }
    if (altura <= 0 || peso <= 0 || temperatura <= 0) {
      this.errorModal = 'Altura, Peso y Temperatura deben ser valores positivos.';
      return false;
    }
    this.errorModal = '';
    return true;
  }

  agregarDatoDinamico() {
    if (this.historiaForm.datosDinamicos.length < 3) {
      this.historiaForm.datosDinamicos.push({ clave: '', valor: '' });
    }
  }

  quitarDatoDinamico(index: number) {
    this.historiaForm.datosDinamicos.splice(index, 1);
  }

  // Helper para el ngFor de datos dinámicos
  trackByDatoIndex(index: number, dato: DatoDinamico): number {
    return index;
  }

  // Helper para el template
  trackByTurnoId(index: number, turno: Turno): string {
    return turno.id;
  }
}
