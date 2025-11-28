import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../../services/turno.service';
import { AuditService, LogIngreso } from '../../../services/audit.service';
import { Turno } from '../../../models/turno';
import { SpinnerService } from '../../../services/spinner.service';
import { DiaSemanaPipe } from '../../../pipes/dia-semana.pipe';
import { DoctorPipe } from '../../../pipes/doctor.pipe';
import { ResaltarDirective } from '../../../directives/resaltar.directive';
import { AgrandarDirective } from '../../../directives/agrandar.directive';

import { firstValueFrom } from 'rxjs';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DiaSemanaPipe,
    DoctorPipe,
    ResaltarDirective,
    AgrandarDirective,
  ],
  templateUrl: './informes.html',
  styleUrls: ['./informes.scss'],
})
export class InformesComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private auditService = inject(AuditService);
  private spinner = inject(SpinnerService);

  // Datos crudos
  logs = signal<LogIngreso[]>([]);
  turnos = signal<Turno[]>([]);

  // Datos procesados para gráficos
  chartEspecialidades: any[] = []; // Ahora contendrá paths SVG
  chartDias: any[] = [];
  chartMedicosSolicitados: any[] = [];
  chartMedicosFinalizados: any[] = [];

  // Filtro de fechas (últimos 30 días por defecto)
  fechaDesde: string;
  fechaHasta: string;

  // Pestaña activa
  activeTab = signal<string>('logs');

  constructor() {
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setDate(hoy.getDate() - 30);
    this.fechaHasta = hoy.toISOString().split('T')[0];
    this.fechaDesde = haceUnMes.toISOString().split('T')[0];
  }

  async ngOnInit() {
    this.spinner.show();
    try {
      const logsData = await this.auditService.getLogsIngresos();
      this.logs.set(logsData);

      const turnosObservable = this.turnoService.getAllTurnos$();
      const turnosData = (await firstValueFrom(turnosObservable)) || [];

      this.turnos.set(turnosData);

      this.actualizarGraficos();
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      this.spinner.hide();
    }
  }

  private getFecha(fecha: any): Date {
    if (!fecha) return new Date();
    if (fecha && typeof fecha.toDate === 'function') {
      return fecha.toDate();
    }
    return new Date(fecha);
  }

  actualizarGraficos() {
    const allTurnos = this.turnos();

    // --- 1. Turnos por Especialidad (SVG PIE) ---
    const espMap = new Map<string, number>();
    allTurnos.forEach((t) => {
      const esp = t.especialidad || 'Sin Especialidad';
      espMap.set(esp, (espMap.get(esp) || 0) + 1);
    });

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const totalTurnos = allTurnos.length || 1;

    // Lógica para generar SVG Paths
    let cumulativePercent = 0;
    this.chartEspecialidades = Array.from(espMap.entries()).map(([label, value], index) => {
      const percent = value / totalTurnos;

      // Calculamos las coordenadas del arco SVG
      const startX = Math.cos(2 * Math.PI * cumulativePercent);
      const startY = Math.sin(2 * Math.PI * cumulativePercent);

      cumulativePercent += percent;

      const endX = Math.cos(2 * Math.PI * cumulativePercent);
      const endY = Math.sin(2 * Math.PI * cumulativePercent);

      // Si es el 100%, dibujamos un círculo completo
      if (percent === 1) {
        return {
          label,
          value,
          color: colors[index % colors.length],
          path: 'M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0 Z', // Círculo completo
        };
      }

      const largeArcFlag = percent > 0.5 ? 1 : 0;

      // Comando SVG: Move to centro, Line to start, Arc to end, Close path
      const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

      return {
        label,
        value,
        color: colors[index % colors.length],
        path: pathData,
      };
    });

    // --- 2. Turnos por Día (Barras) ---
    const diasMap = new Map<string, number>();
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    allTurnos.forEach((t) => {
      const fecha = this.getFecha(t.fecha);
      const diaNombre = diasSemana[fecha.getDay()];
      diasMap.set(diaNombre, (diasMap.get(diaNombre) || 0) + 1);
    });

    const maxDias = Math.max(...Array.from(diasMap.values()), 1);

    this.chartDias = Array.from(diasMap.entries()).map(([label, value]) => ({
      label,
      value,
      height: (value / maxDias) * 100,
      color: '#6366f1',
    }));

    // --- FILTRO POR FECHAS ---
    const desde = new Date(this.fechaDesde);
    desde.setHours(0, 0, 0, 0);

    const hasta = new Date(this.fechaHasta);
    hasta.setHours(23, 59, 59, 999);

    const turnosEnRango = allTurnos.filter((t) => {
      const f = this.getFecha(t.fecha);
      return f >= desde && f <= hasta;
    });

    // --- 3. Solicitados por Médico ---
    const medSolMap = new Map<string, number>();
    turnosEnRango.forEach((t) => {
      const med = t.especialistaNombre || 'Desconocido';
      medSolMap.set(med, (medSolMap.get(med) || 0) + 1);
    });
    const maxSol = Math.max(...Array.from(medSolMap.values()), 1);

    this.chartMedicosSolicitados = Array.from(medSolMap.entries()).map(([label, value]) => ({
      label,
      value,
      height: (value / maxSol) * 100,
      color: '#0ea5e9',
    }));

    // --- 4. Finalizados por Médico ---
    const medFinMap = new Map<string, number>();
    turnosEnRango
      .filter((t) => t.estado === 'realizado')
      .forEach((t) => {
        const med = t.especialistaNombre || 'Desconocido';
        medFinMap.set(med, (medFinMap.get(med) || 0) + 1);
      });
    const maxFin = Math.max(...Array.from(medFinMap.values()), 1);

    this.chartMedicosFinalizados = Array.from(medFinMap.entries()).map(([label, value]) => ({
      label,
      value,
      height: (value / maxFin) * 100,
      color: '#10b981',
    }));
  }

  // --- DESCARGAS ---

  descargarExcelLogs() {
    const data = this.logs().map((l) => ({
      Usuario: l.usuario,
      Rol: l.rol,
      Fecha: this.getFecha(l.fecha).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');
    XLSX.writeFile(wb, 'log_ingresos.xlsx');
  }

  async descargarPDFGraficos() {
    this.spinner.show();
    setTimeout(async () => {
      const data = document.getElementById('charts-printable');
      if (data) {
        try {
          // Usamos html2canvas con opciones básicas que funcionan bien con SVG
          const canvas = await html2canvas(data, {
            scale: 2,
            useCORS: true,
          });
          const imgWidth = 208;
          const pageHeight = 295;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          const doc = new jsPDF('p', 'mm', 'a4');
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
          doc.save('informes_clinica.pdf');
        } catch (e) {
          console.error(e);
        } finally {
          this.spinner.hide();
        }
      } else {
        this.spinner.hide();
      }
    }, 500);
  }
}
