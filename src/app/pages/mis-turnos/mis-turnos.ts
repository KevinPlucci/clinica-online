import { Component, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap, of } from 'rxjs';

// Servicios y Modelos
import { AuthService } from '../../services/auth.service';
import { TurnoService } from '../../services/turno.service';
import { Usuario } from '../../models/usuario';
import { Turno } from '../../models/turno';

// Pipes
import { FiltroTurnosPipe } from '../../pipes/filtro-turnos.pipe';

// Tipo para el contexto del modal
type ModalContexto = 'cancelar' | 'rechazar' | 'finalizar' | 'calificar' | 'encuesta' | 'verReseña';

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

  // Datos del usuario y sus turnos
  me$: Observable<Usuario | null> = this.auth.me$;
  turnos$: Observable<Turno[]>;

  // Filtro
  filtro$ = new BehaviorSubject<string>('');
  filtroInput = '';

  // Estado del Modal
  modalVisible = false;
  modalContexto: ModalContexto | null = null;
  turnoSeleccionado: Turno | null = null;
  comentarioModal = '';
  errorModal = '';

  constructor() {
    // Obtenemos los turnos basándonos en el rol del usuario
    this.turnos$ = this.auth.me$.pipe(
      switchMap((user) => {
        if (!user) return of([]);

        // Usamos this.env (inyectado en la clase) y runInInjectionContext
        // para llamar a los servicios de forma segura.
        return runInInjectionContext(this.env, () => {
          if (user.rol === 'paciente') {
            return this.turnoService.getTurnosParaPaciente(user.uid);
          }
          if (user.rol === 'especialista') {
            return this.turnoService.getTurnosParaEspecialista(user.uid);
          }
          return of([]); // Admin u otro rol ven un array vacío
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

  /**
   * Devuelve el link de "vuelta" según el rol del usuario.
   * Esto nos lleva a la pantalla de bienvenida específica de ese rol.
   */
  getVolverLink(rol: Usuario['rol']): string {
    switch (rol) {
      case 'paciente':
        return '/paciente/turnos';
      case 'especialista':
        return '/especialista/agenda';
      default:
        return '/bienvenida'; // Fallback
    }
  }

  // --- Lógica del Modal ---

  /**
   * Abre el modal para una acción específica (cancelar, finalizar, etc.)
   */
  abrirModal(contexto: ModalContexto, turno: Turno) {
    this.modalContexto = contexto;
    this.turnoSeleccionado = turno;
    this.comentarioModal = '';
    this.errorModal = '';

    // Si es "verReseña", precargamos el comentario
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

  /**
   * Confirma la acción del modal
   */
  async confirmarModal() {
    if (!this.turnoSeleccionado) return;
    const id = this.turnoSeleccionado.id;
    const comentario = this.comentarioModal.trim();

    // Validamos que se ingrese un comentario si es necesario
    // (Ya está corregido el error de TypeScript)
    if (
      this.modalContexto !== 'verReseña' &&
      this.modalContexto !== 'encuesta' && // Encuesta puede ser un form más complejo
      !comentario
    ) {
      this.errorModal = 'Por favor, dejá un comentario para continuar.';
      return;
    }

    this.errorModal = '';

    try {
      // Ejecutamos la acción del servicio de turnos
      switch (this.modalContexto) {
        case 'cancelar':
          await this.turnoService.cancelarTurno(id, comentario);
          break;
        case 'rechazar':
          await this.turnoService.rechazarTurno(id, comentario);
          break;
        case 'finalizar':
          await this.turnoService.finalizarTurno(id, comentario);
          break;
        case 'calificar':
          await this.turnoService.calificarAtencion(id, comentario);
          break;
        case 'encuesta':
          // Lógica simple, solo guardamos el texto.
          await this.turnoService.completarEncuesta(id, {
            respuesta: comentario,
          });
          break;
        // 'verReseña' no hace nada al confirmar
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

  // Helper para el template
  trackByTurnoId(index: number, turno: Turno): string {
    return turno.id;
  }
}
