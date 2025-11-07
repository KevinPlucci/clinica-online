import { Component, inject, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap, of } from 'rxjs';

// Servicios y Modelos
import { AuthService } from '../../../services/auth.service';
import { TurnoService } from '../../../services/turno.service';
import { Usuario } from '../../../models/usuario';
import { Turno } from '../../../models/turno';

// Pipes
import { FiltroTurnosPipe } from '../../../pipes/filtro-turnos.pipe';

// Tipo para el contexto del modal (solo cancelar)
type ModalContexto = 'cancelar';

@Component({
  selector: 'app-seccion-turnos',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FiltroTurnosPipe, DatePipe],
  templateUrl: './seccion-turnos.html',
  styleUrls: ['./seccion-turnos.scss'],
})
export class SeccionTurnosComponent {
  private auth = inject(AuthService);
  private turnoService = inject(TurnoService);
  private router = inject(Router);
  private env = inject(EnvironmentInjector);

  // Datos del usuario (para verificar que es admin)
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
    // Obtenemos TODOS los turnos usando el servicio
    this.turnos$ = this.auth.me$.pipe(
      switchMap((user) => {
        // Doble chequeo por si acaso
        if (user?.rol !== 'admin') {
          this.router.navigate(['/bienvenida']);
          return of([]);
        }

        return runInInjectionContext(this.env, () => {
          return this.turnoService.getAllTurnos();
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
   * Devuelve el link de "vuelta" al panel de usuarios
   */
  getVolverLink(): string {
    return '/admin/usuarios';
  }

  // --- Lógica del Modal ---

  /**
   * Abre el modal para cancelar un turno
   */
  abrirModal(contexto: ModalContexto, turno: Turno) {
    this.modalContexto = contexto;
    this.turnoSeleccionado = turno;
    this.comentarioModal = '';
    this.errorModal = '';
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.modalContexto = null;
    this.turnoSeleccionado = null;
  }

  /**
   * Confirma la cancelación del turno
   */
  async confirmarModal() {
    if (!this.turnoSeleccionado || this.modalContexto !== 'cancelar') return;

    const id = this.turnoSeleccionado.id;
    const comentario = this.comentarioModal.trim();

    // Validamos que se ingrese un comentario
    if (!comentario) {
      this.errorModal = 'Por favor, dejá un comentario para cancelar.';
      return;
    }

    this.errorModal = '';

    try {
      await this.turnoService.cancelarTurno(id, comentario);
      this.cerrarModal();
    } catch (e) {
      console.error(e);
      this.errorModal = 'Ocurrió un error al procesar la solicitud.';
    }
  }

  // Helper para el template
  trackByTurnoId(index: number, turno: Turno): string {
    return turno.id;
  }
}
