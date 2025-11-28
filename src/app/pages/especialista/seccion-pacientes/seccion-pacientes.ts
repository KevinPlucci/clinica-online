import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs'; // <--- IMPORTANTE: Agregamos esto
import { Usuario } from '../../../models/usuario';
import { Turno } from '../../../models/turno';
import { AuthService } from '../../../services/auth.service';
import { TurnoService } from '../../../services/turno.service';
import { UsuarioService } from '../../../services/usuario.service';
import { SpinnerService } from '../../../services/spinner.service';
import { HistoriaClinicaComponent } from '../../../shared/historia-clinica/historia-clinica';

@Component({
  selector: 'app-seccion-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, HistoriaClinicaComponent],
  templateUrl: './seccion-pacientes.html',
  styleUrls: ['./seccion-pacientes.scss'],
})
export class SeccionPacientesComponent implements OnInit {
  private auth = inject(AuthService);
  private turnoService = inject(TurnoService);
  private usuarioService = inject(UsuarioService);
  public spinner = inject(SpinnerService);

  pacientes = signal<Usuario[]>([]);
  pacienteSeleccionado = signal<Usuario | null>(null);
  turnosConElPaciente = signal<Turno[]>([]);

  async ngOnInit() {
    this.spinner.show();
    try {
      // CORRECCIÓN: Usamos firstValueFrom(this.auth.me$) en lugar de getCurrentUser()
      const user = await firstValueFrom(this.auth.me$);

      if (user && user.uid) {
        // 1. Traer todos los turnos DEL ESPECIALISTA
        const turnos = await this.turnoService.getTurnosParaEspecialista(user.uid);

        // 2. Filtrar turnos realizados
        const realizados = turnos.filter((t) => t.estado === 'realizado');

        // 3. Extraer IDs de pacientes únicos
        const pacientesIds = new Set(realizados.map((t) => t.pacienteId));

        // 4. Traer la info completa de esos usuarios
        const todosLosUsuarios = await this.usuarioService.getAllUsuarios();
        const misPacientes = todosLosUsuarios.filter((u) => pacientesIds.has(u.uid));

        this.pacientes.set(misPacientes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.spinner.hide();
    }
  }

  async seleccionarPaciente(paciente: Usuario) {
    if (this.pacienteSeleccionado()?.uid === paciente.uid) {
      this.pacienteSeleccionado.set(null);
      return;
    }

    this.pacienteSeleccionado.set(paciente);
    this.spinner.show();

    try {
      // CORRECCIÓN: Aquí también usamos firstValueFrom(this.auth.me$)
      const user = await firstValueFrom(this.auth.me$);

      if (user) {
        const turnos = await this.turnoService.getTurnosParaEspecialista(user.uid);
        // Filtramos: Turnos con ESE paciente y que estén REALIZADOS
        const historia = turnos.filter(
          (t) => t.pacienteId === paciente.uid && t.estado === 'realizado'
        );
        // Ordenamos por fecha (más reciente primero)
        historia.sort((a, b) => b.fecha['seconds'] - a.fecha['seconds']);

        this.turnosConElPaciente.set(historia);
      }
    } finally {
      this.spinner.hide();
    }
  }
}
