import {
  Component,
  inject,
  signal,
  effect,
  WritableSignal,
  runInInjectionContext,
  EnvironmentInjector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import jsPDF from 'jspdf';

// Modelos y Servicios
import { Usuario, HorarioConfig } from '../../models/usuario';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
import { TurnoService } from '../../services/turno.service';

// +++ 1. IMPORTAR EL COMPONENTE NUEVO +++
import { HistoriaClinicaComponent } from '../../shared/historia-clinica/historia-clinica';

// Tipo local para el formulario
type HorarioForm = WritableSignal<HorarioConfig>;

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  // +++ 2. AGREGAR EL COMPONENTE A LOS IMPORTS +++
  imports: [CommonModule, RouterLink, FormsModule, HistoriaClinicaComponent],
  templateUrl: './mi-perfil.html',
  styleUrls: ['./mi-perfil.scss'],
})
export class MiPerfilComponent {
  private auth = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private turnoService = inject(TurnoService);
  private router = inject(Router);
  private env = inject(EnvironmentInjector);

  me = signal<Usuario | null>(null);
  cargando = signal<boolean>(true);
  editando = signal<boolean>(false);
  mensaje = signal<string | null>(null);
  descargandoPdf = signal<boolean>(false);

  // Días de la semana para el <select>
  diasSemana = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
  ];

  horariosMap: Map<string, HorarioConfig[]> = new Map();

  constructor() {
    this.cargarDatosUsuario();
  }

  async cargarDatosUsuario() {
    this.cargando.set(true);
    // +++ MODIFICADO: Usar el servicio de usuario en lugar de auth.me$ +++
    // (Asumiendo que auth.me$ solo da el user de auth, y necesitamos el de la BBDD)
    const authUser = await firstValueFrom(this.auth.me$);
    if (authUser) {
      // Usamos getUsuario (Observable) con firstValueFrom
      const user = await firstValueFrom(this.usuarioService.getUsuario(authUser.uid));
      this.me.set(user);
      if (user && user.rol === 'especialista' && user.especialidades) {
        this.inicializarHorariosMap(user);
      }
    }
    this.cargando.set(false);
  }

  inicializarHorariosMap(user: Usuario) {
    this.horariosMap.clear();
    const dispo = user.disponibilidad || {};
    (user.especialidades || []).forEach((esp) => {
      const horariosGuardados = dispo[esp] ? JSON.parse(JSON.stringify(dispo[esp])) : [];
      this.horariosMap.set(esp, horariosGuardados);
    });
  }

  addHorario(especialidad: string) {
    const horarios = this.horariosMap.get(especialidad);
    if (horarios) {
      horarios.push({
        dia: 1,
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
    this.inicializarHorariosMap(this.me()!);
  }

  getHorariosArray(especialidad: string): HorarioConfig[] {
    return this.horariosMap.get(especialidad) || [];
  }

  private async getBase64Image(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async descargarHistoriaClinica() {
    const user = this.me();
    if (!user || user.rol !== 'paciente') return;

    this.descargandoPdf.set(true);
    try {
      // +++ MODIFICADO: Usar la nueva función async del servicio +++
      const historial = await this.turnoService.getTurnosParaPaciente(user.uid);
      // El filtro de 'realizado' ya no es necesario aquí si la función async lo hace,
      // pero nuestra nueva función async NO lo hace. La de PeticionesPDF sí lo hacía.
      // Lo agregamos aquí para seguridad.
      const historialFiltrado = historial.filter((t) => t.estado === 'realizado');

      const doc = new jsPDF();
      const fechaEmision = new Date().toLocaleDateString();

      try {
        const logoBase64 = await this.getBase64Image('assets/logo-clinica.png');
        doc.addImage(logoBase64, 'PNG', 14, 15, 40, 15);
      } catch (imgError) {
        console.error('No se pudo cargar el logo, se usará texto como fallback.', imgError);
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138);
        doc.text('Clínica Online', 14, 20);
      }

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha de emisión: ${fechaEmision}`, 140, 20);

      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.text('Historia Clínica', 14, 45);

      doc.setFontSize(12);
      doc.text(`Paciente: ${user.nombre} ${user.apellido}`, 14, 55);
      doc.text(`DNI: ${user.dni}`, 14, 62);
      doc.text(`Obra Social: ${user.obraSocial}`, 14, 69);

      let yPos = 85;
      doc.setLineWidth(0.5);
      doc.line(14, 75, 200, 75);

      if (historialFiltrado.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('No hay registros de atención finalizada.', 14, yPos);
      } else {
        historialFiltrado.forEach((turno, index) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const fecha = turno.fecha.toDate().toLocaleString();
          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.setFont('helvetica', 'bold');
          doc.text(`Fecha: ${fecha} - Especialidad: ${turno.especialidad}`, 14, yPos);
          yPos += 7;
          doc.setFont('helvetica', 'normal');
          doc.text(`Profesional: ${turno.especialistaNombre}`, 14, yPos);
          yPos += 7;
          const reseña = doc.splitTextToSize(
            `Diagnóstico/Reseña: ${turno.comentario || 'Sin observaciones.'}`,
            180
          );
          doc.text(reseña, 14, yPos);
          yPos += reseña.length * 7 + 10;
        });
      }
      doc.save(`historia_clinica_${user.apellido}_${user.nombre}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF', e);
    } finally {
      this.descargandoPdf.set(false);
    }
  }
}
