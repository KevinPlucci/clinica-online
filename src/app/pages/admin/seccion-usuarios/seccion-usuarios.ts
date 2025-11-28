import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario';
import { SpinnerService } from '../../../services/spinner.service';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/toast.service';
import { ToastsComponent } from '../../../shared/toasts/toasts';
import * as XLSX from 'xlsx';
import { HistoriaClinicaComponent } from '../../../shared/historia-clinica/historia-clinica';

// +++ IMPORTAMOS SERVICIO DE TURNOS PARA EL EXCEL INDIVIDUAL +++
import { TurnoService } from '../../../services/turno.service';

type RolFiltro = 'all' | 'admin' | 'paciente' | 'especialista';
type EstadoFiltro = 'all' | 'habilitado' | 'inhabilitado';
type VerifFiltro = 'all' | 'verificado' | 'noverificado';
type SortKey = 'nombre' | 'rol' | 'email' | 'dni' | 'estado' | 'verif';

@Component({
  selector: 'app-seccion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastsComponent, RouterLink, HistoriaClinicaComponent],
  templateUrl: './seccion-usuarios.html',
  styleUrls: ['./seccion-usuarios.scss'],
})
export class SeccionUsuariosComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private turnoService = inject(TurnoService); // <--- INYECCIÓN
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private toasts = inject(ToastService);

  pacienteSeleccionado = signal<Usuario | null>(null);

  // --- Señal para alternar vista ---
  vista = signal<'tabla' | 'tarjetas'>('tabla');

  // --- Señales de estado ---
  usuarios = signal<Usuario[]>([]);
  query = signal<string>('');
  rol = signal<RolFiltro>('all');
  estado = signal<EstadoFiltro>('all');
  verif = signal<VerifFiltro>('all');

  sortKey = signal<SortKey>('nombre');
  sortDir = signal<'asc' | 'desc'>('asc');

  page = signal<number>(1);
  pageSize = signal<number>(10);

  selected = signal<Set<string>>(new Set());

  // --- Señales Computadas ---
  allSelectedOnPage = computed(() => this.paged().every((u) => this.selected().has(u.uid)));
  selectedCount = computed(() => this.selected().size);
  selectedSpecialists = computed(() =>
    this.usuarios().filter((u) => this.selected().has(u.uid) && u.rol === 'especialista')
  );
  selectedSpecialistsCount = computed(() => this.selectedSpecialists().length);

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const rf = this.rol(),
      ef = this.estado(),
      vf = this.verif();
    return this.usuarios().filter((u) => {
      if (rf !== 'all' && u.rol !== rf) return false;
      const est =
        u.rol === 'especialista' ? (u.habilitado !== false ? 'habilitado' : 'inhabilitado') : '—';
      if (ef !== 'all' && (est === '—' || est !== ef)) return false;
      const ver = (u as any).emailVerified ? 'verificado' : 'noverificado';
      if (vf !== 'all' && ver !== vf) return false;

      if (!q) return true;
      const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const dni = (u.dni ?? '').toString().toLowerCase();
      return nombre.includes(q) || email.includes(q) || dni.includes(q);
    });
  });

  sorted = computed(() => {
    const key = this.sortKey(),
      dir = this.sortDir();
    const list = [...this.filtered()];
    const cmp = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);
    list.sort((a, b) => {
      let av: any, bv: any;
      switch (key) {
        case 'nombre':
          av = `${a.nombre ?? ''} ${a.apellido ?? ''}`.toLowerCase();
          bv = `${b.nombre ?? ''} ${b.apellido ?? ''}`.toLowerCase();
          break;
        case 'rol':
          av = a.rol;
          bv = b.rol;
          break;
        case 'email':
          av = (a.email ?? '').toLowerCase();
          bv = (b.email ?? '').toLowerCase();
          break;
        case 'dni':
          av = a.dni ?? '';
          bv = b.dni ?? '';
          break;
        case 'estado':
          av =
            a.rol === 'especialista'
              ? a.habilitado !== false
                ? 'habilitado'
                : 'inhabilitado'
              : '—';
          bv =
            b.rol === 'especialista'
              ? b.habilitado !== false
                ? 'habilitado'
                : 'inhabilitado'
              : '—';
          break;
        case 'verif':
          av = (a as any).emailVerified ? 'verificado' : 'noverificado';
          bv = (b as any).emailVerified ? 'verificado' : 'noverificado';
          break;
      }
      const r = cmp(av, bv);
      return dir === 'asc' ? r : -r;
    });
    return list;
  });

  paged = computed(() => {
    const p = this.page(),
      ps = this.pageSize();
    const start = (p - 1) * ps;
    return this.sorted().slice(start, start + ps);
  });

  total = computed(() => this.filtered().length);

  constructor() {
    effect(() => {
      this.query();
      this.rol();
      this.estado();
      this.verif();
      this.page.set(1);
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  toggleVista() {
    this.vista.update((v) => (v === 'tabla' ? 'tarjetas' : 'tabla'));
  }

  async cargarUsuarios() {
    this.spinner.show();
    try {
      const list = await this.usuarioService.getAllUsuarios();
      this.usuarios.set(list ?? []);
    } catch (e) {
      console.error(e);
      this.toasts.error('No se pudo cargar la lista de usuarios');
    } finally {
      this.spinner.hide();
    }
  }

  crearNuevoUsuario() {
    this.router.navigate(['/admin/usuarios/nuevo']);
  }
  volverABienvenida() {
    this.router.navigate(['/bienvenida']);
  }

  toggleSort(key: SortKey) {
    if (this.sortKey() === key) this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  toggleSelect(uid: string) {
    const s = new Set(this.selected());
    if (s.has(uid)) s.delete(uid);
    else s.add(uid);
    this.selected.set(s);
  }

  toggleSelectAllPage() {
    const s = new Set(this.selected());
    const all = this.allSelectedOnPage();
    this.paged().forEach((u) => {
      if (all) s.delete(u.uid);
      else s.add(u.uid);
    });
    this.selected.set(s);
  }

  clearSelection() {
    this.selected.set(new Set());
  }

  async bulkHabilitar(habilitar: boolean) {
    const items = this.selectedSpecialists();
    if (items.length === 0) {
      this.toasts.info('No hay especialistas seleccionados');
      return;
    }
    this.spinner.show();
    let okCount = 0,
      failCount = 0;
    for (const u of items) {
      try {
        await this.usuarioService.updateHabilitado(u.uid, habilitar);
        u.habilitado = habilitar;
        okCount++;
      } catch {
        failCount++;
      }
    }
    this.spinner.hide();
    this.toasts.success(`${okCount} especialistas actualizados`);
    if (failCount > 0) this.toasts.warning(`${failCount} fallaron`);
    this.clearSelection();
  }

  exportExcel() {
    const rows = this.filtered();
    if (rows.length === 0) {
      this.toasts.info('No hay datos');
      return;
    }
    const data = rows.map((u) => ({
      Rol: u.rol,
      Nombre: u.nombre,
      Apellido: u.apellido,
      Email: u.email,
      DNI: u.dni || '-',
      Estado:
        u.rol === 'especialista' ? (u.habilitado !== false ? 'Habilitado' : 'Inhabilitado') : '-',
      Verificacion: u.emailVerified ? 'Verificado' : 'Pendiente',
    }));
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, `usuarios_general_${new Date().getTime()}.xlsx`);
    this.toasts.success(`Excel general exportado`);
  }

  // +++ NUEVA FUNCIÓN: Descargar Excel de un usuario específico +++
  async descargarExcelUsuario(u: Usuario) {
    if (u.rol !== 'paciente') {
      this.toasts.info('Solo disponible para pacientes');
      return;
    }
    this.spinner.show();
    try {
      const turnos = await this.turnoService.getTurnosParaPaciente(u.uid);
      if (turnos.length === 0) {
        this.toasts.info(`El paciente ${u.nombre} no tiene turnos.`);
        this.spinner.hide();
        return;
      }
      const data = turnos.map((t) => ({
        Fecha: t.fecha.toDate().toLocaleString(),
        Especialidad: t.especialidad,
        Especialista: t.especialistaNombre,
        Estado: t.estado,
        Reseña: t.comentario || '-',
      }));
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Turnos Paciente');
      XLSX.writeFile(wb, `turnos_${u.apellido}_${u.nombre}.xlsx`);
      this.toasts.success(`Excel de ${u.nombre} descargado`);
    } catch (e) {
      console.error(e);
      this.toasts.error('Error al generar Excel');
    } finally {
      this.spinner.hide();
    }
  }

  async cambiarEstadoHabilitado(u: Usuario) {
    if (u.rol !== 'especialista') return;
    this.spinner.show();
    try {
      await this.usuarioService.updateHabilitado(u.uid, !(u.habilitado !== false));
      u.habilitado = !(u.habilitado !== false);
      this.toasts.success(`Estado actualizado`);
    } catch (e: any) {
      console.error(e);
      this.toasts.error('Error al actualizar');
    } finally {
      this.spinner.hide();
    }
  }

  prevPage() {
    if (this.page() > 1) this.page.update((p) => p - 1);
  }
  nextPage() {
    const pages = Math.max(1, Math.ceil(this.total() / this.pageSize()));
    if (this.page() < pages) this.page.update((p) => p + 1);
  }

  verHistorialPaciente(u: Usuario) {
    if (u.rol !== 'paciente') {
      this.pacienteSeleccionado.set(null);
      return;
    }
    if (this.pacienteSeleccionado()?.uid === u.uid) {
      this.pacienteSeleccionado.set(null);
    } else {
      this.pacienteSeleccionado.set(u);
    }
  }
}
