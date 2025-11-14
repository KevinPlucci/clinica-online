import { Component, inject, Input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TurnoService } from '../../services/turno.service';
import { Turno } from '../../models/turno'; // <-- Revisa que la ruta a tu modelo Turno sea correcta
import { firstValueFrom } from 'rxjs'; // +++ IMPORTAR firstValueFrom +++

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './historia-clinica.html',
  styleUrl: './historia-clinica.scss',
})
export class HistoriaClinicaComponent implements OnChanges {
  @Input() pacienteId: string = '';
  private turnoService = inject(TurnoService);

  public historial = signal<Turno[]>([]);
  public cargando = signal<boolean>(true);

  // +++ MODIFICADO: Usar OnChanges para reaccionar al cambio de Input +++
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pacienteId'] && this.pacienteId) {
      this.cargarHistorial();
    } else if (!this.pacienteId) {
      // Si el pacienteId se vuelve nulo (ej. al des-seleccionar)
      this.cargando.set(false);
      this.historial.set([]);
    }
  }

  async cargarHistorial() {
    this.cargando.set(true);
    this.historial.set([]);

    try {
      // +++ MODIFICADO: Usar firstValueFrom para convertir el Observable en Promesa +++
      const turnos = await firstValueFrom(
        this.turnoService.getTurnosParaPaciente$(this.pacienteId)
      );

      const historialFiltrado = turnos
        .filter((t) => t.estado === 'realizado')
        .sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());

      this.historial.set(historialFiltrado);
    } catch (error) {
      console.error('Error cargando la historia clínica:', error);
    } finally {
      this.cargando.set(false);
    }
  }
}
