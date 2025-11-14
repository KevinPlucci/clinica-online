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

// 1. IMPORTAR EL COMPONENTE DE HISTORIA CLÍNICA
import { HistoriaClinicaComponent } from '../../../shared/historia-clinica/historia-clinica';

type RolFiltro = 'all' | 'admin' | 'paciente' | 'especialista';
type EstadoFiltro = 'all' | 'habilitado' | 'inhabilitado';
type VerifFiltro = 'all' | 'verificado' | 'noverificado';
type SortKey = 'nombre' | 'rol' | 'email' | 'dni' | 'estado' | 'verif';

@Component({
  selector: 'app-seccion-usuarios',
  standalone: true,
  // 2. AGREGAR 'HistoriaClinicaComponent' A LOS IMPORTS
  imports: [CommonModule, FormsModule, ToastsComponent, RouterLink, HistoriaClinicaComponent],
  templateUrl: './seccion-usuarios.html',
  styleUrls: ['./seccion-usuarios.scss'],
})
export class SeccionUsuariosComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private toasts = inject(ToastService);

  // 3. SEÑAL PARA EL PACIENTE SELECCIONADO
  pacienteSeleccionado = signal<Usuario | null>(null);

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

  // --- Señales Computadas (Selección) ---
  allSelectedOnPage = computed(() => this.paged().every((u) => this.selected().has(u.uid)));
  selectedCount = computed(() => this.selected().size);
  selectedSpecialists = computed(() =>
    this.usuarios().filter((u) => this.selected().has(u.uid) && u.rol === 'especialista')
  );
  selectedSpecialistsCount = computed(() => this.selectedSpecialists().length);

  // --- Señales Computadas (Datos) ---

  // 1. Filtra la lista base de usuarios
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

  // 2. Ordena la lista filtrada
  sorted = computed(() => {
    const key = this.sortKey(),
      dir = this.sortDir();
    const list = [...this.filtered()]; // Trabaja sobre la lista filtrada
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
          // +++ ESTA ES LA LÍNEA CORREGIDA +++
          bv = (b as any).emailVerified ? 'verificado' : 'noverificado';
          break;
      }
      const r = cmp(av, bv);
      return dir === 'asc' ? r : -r;
    });
    return list;
  });

  // 3. Pagina la lista ordenada
  paged = computed(() => {
    const p = this.page(),
      ps = this.pageSize();
    const start = (p - 1) * ps;
    return this.sorted().slice(start, start + ps); // Trabaja sobre la lista ordenada
  });

  // 4. El total se basa en 'filtered()', NO en 'paged()'.
  total = computed(() => this.filtered().length);

  constructor() {
    // Resetea la página a 1 si cualquier filtro cambia
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

    // NOTA: Reemplaza window.confirm con un modal si es posible
    const verbo = habilitar ? 'habilitar' : 'inhabilitar';
    // const ok = window.confirm(`¿Confirmás ${verbo} ${items.length} especialista(s) seleccionados?`);
    // if (!ok) return;

    this.spinner.show();
    let okCount = 0,
      failCount = 0;
    for (const u of items) {
      try {
        await this.usuarioService.updateHabilitado(u.uid, habilitar);
        u.habilitado = habilitar; // Actualiza el estado local
        okCount++;
      } catch {
        failCount++;
      }
    }
    this.spinner.hide();
    this.toasts.success(
      `${okCount} especialista(s) ${habilitar ? 'habilitados' : 'inhabilitados'} correctamente`
    );
    if (failCount > 0) this.toasts.warning(`${failCount} no pudieron actualizarse`);
    this.clearSelection();
  }

  exportExcel() {
    const rows = this.filtered(); // Exporta TODOS los filtrados, no solo la página
    if (rows.length === 0) {
      this.toasts.info('No hay datos para exportar');
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
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    XLSX.writeFile(wb, `usuarios_clinica_${stamp}.xlsx`);
    this.toasts.success(`Exportado a Excel ${rows.length} registro(s)`);
  }

  async cambiarEstadoHabilitado(u: Usuario) {
    if (u.rol !== 'especialista') return;
    const target = u.habilitado !== false ? 'inhabilitar' : 'habilitar';

    // NOTA: Reemplaza window.confirm con un modal si es posible
    // const ok = window.confirm(
    //   `¿Confirmás ${target} al especialista "${u.nombre ?? ''} ${u.apellido ?? ''}"?`
    // );
    // if (!ok) return;

    this.spinner.show();
    try {
      await this.usuarioService.updateHabilitado(u.uid, !(u.habilitado !== false));
      u.habilitado = !(u.habilitado !== false); // Actualiza el estado local
      this.toasts.success(
        `Especialista ${u.habilitado ? 'habilitado' : 'inhabilitado'} correctamente`
      );
    } catch (e: any) {
      console.error(e);
      this.toasts.error(e?.message || 'No se pudo actualizar el estado');
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

  // 4. NUEVA FUNCIÓN PARA SELECCIONAR PACIENTE (Y VER HISTORIAL)
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
