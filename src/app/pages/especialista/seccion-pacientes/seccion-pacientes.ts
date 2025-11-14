import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { TurnoService } from '../../../services/turno.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario';
import { HistoriaClinicaComponent } from '../../../shared/historia-clinica/historia-clinica';

@Component({
  selector: 'app-seccion-pacientes',
  standalone: true,
  imports: [CommonModule, HistoriaClinicaComponent],
  templateUrl: './seccion-pacientes.html',
  styleUrls: ['./seccion-pacientes.scss'],
})
export class SeccionPacientesComponent implements OnInit {
  private auth = inject(AuthService);
  private turnoService = inject(TurnoService);
  private usuarioService = inject(UsuarioService);

  public pacientesAtendidos = signal<Usuario[]>([]);
  public pacienteSeleccionado = signal<Usuario | null>(null);
  public cargando = signal<boolean>(true);

  private especialistaId: string = '';

  async ngOnInit() {
    this.cargando.set(true);
    // Obtenemos el ID del especialista logueado
    const user = await firstValueFrom(this.auth.me$);
    if (!user || user.rol !== 'especialista') {
      console.error('Acceso denegado o usuario no es especialista.');
      this.cargando.set(false);
      return;
    }
    this.especialistaId = user.uid;
    await this.cargarPacientesAtendidos();
    this.cargando.set(false);
  }

  async cargarPacientesAtendidos() {
    try {
      // 1. Traer turnos del especialista (usando la nueva función async)
      const turnos = await this.turnoService.getTurnosParaEspecialista(this.especialistaId);

      // 2. Filtrar solo los realizados
      const turnosRealizados = turnos.filter((t) => t.estado === 'realizado');

      // 3. Obtener una lista de IDs de pacientes ÚNICOS
      const pacienteIds = [...new Set(turnosRealizados.map((t) => t.pacienteId))];

      if (pacienteIds.length > 0) {
        // 4. Traer los datos de esos pacientes (usando la nueva función async)
        const pacientes = await this.usuarioService.getUsuariosPorListaDeIds(pacienteIds);
        this.pacientesAtendidos.set(pacientes);
      }
    } catch (error) {
      console.error('Error cargando pacientes atendidos:', error);
    }
  }

  seleccionarPaciente(paciente: Usuario) {
    if (this.pacienteSeleccionado()?.uid === paciente.uid) {
      this.pacienteSeleccionado.set(null); // Des-seleccionar
    } else {
      this.pacienteSeleccionado.set(paciente); // Seleccionar
    }
  }
}
