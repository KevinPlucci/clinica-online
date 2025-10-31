// src/app/pages/admin/seccion-usuarios/seccion-usuarios.ts

import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario';
import { SpinnerService } from '../../../services/spinner.service';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/toast.service';
import { ToastsComponent } from '../../../shared/toasts/toasts';

type RolFiltro = 'all' | 'admin' | 'paciente' | 'especialista';
type EstadoFiltro = 'all' | 'habilitado' | 'inhabilitado';
type VerifFiltro = 'all' | 'verificado' | 'noverificado';
type SortKey = 'nombre' | 'rol' | 'email' | 'dni' | 'estado' | 'verif';

@Component({
  selector: 'app-seccion-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastsComponent],
  templateUrl: './seccion-usuarios.html',
  styleUrls: ['./seccion-usuarios.scss'],
})
export class SeccionUsuariosComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private toasts = inject(ToastService);

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
    this.usuarioService.usuarios$().subscribe((list) => this.usuarios.set(list ?? []));
  }

  crearNuevoUsuario() {
    this.router.navigate(['/admin/usuarios/nuevo']);
  }

  /**
   * FIX: Agregamos esta función para volver
   */
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

  // Selección
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

  // Acciones en lote (solo especialistas)
  async bulkHabilitar(habilitar: boolean) {
    const items = this.selectedSpecialists();
    if (items.length === 0) {
      this.toasts.info('No hay especialistas seleccionados');
      return;
    }

    const verbo = habilitar ? 'habilitar' : 'inhabilitar';
    const ok = window.confirm(`¿Confirmás ${verbo} ${items.length} especialista(s) seleccionados?`);
    if (!ok) return;

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
    this.toasts.success(
      `${okCount} especialista(s) ${habilitar ? 'habilitados' : 'inhabilitados'} correctamente`
    );
    if (failCount > 0) this.toasts.warning(`${failCount} no pudieron actualizarse`);
    this.clearSelection();
  }

  // Export CSV
  exportCsv() {
    const rows = this.filtered();
    if (rows.length === 0) {
      this.toasts.info('No hay datos para exportar');
      return;
    }
    const headers = ['uid', 'rol', 'nombre', 'apellido', 'email', 'dni', 'estado', 'verificacion'];
    const lines = [headers.join(',')];
    for (const u of rows) {
      const estado =
        u.rol === 'especialista' ? (u.habilitado !== false ? 'habilitado' : 'inhabilitado') : '—';
      const verif = (u as any).emailVerified ? 'verificado' : 'noverificado';
      const vals = [
        u.uid,
        u.rol,
        (u.nombre ?? '').replace(/,/g, ' '),
        (u.apellido ?? '').replace(/,/g, ' '),
        u.email ?? '',
        u.dni ?? '',
        estado,
        verif,
      ];
      lines.push(vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `usuarios_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toasts.success(`Exportado ${rows.length} registro(s)`);
  }

  async cambiarEstadoHabilitado(u: Usuario) {
    if (u.rol !== 'especialista') return;
    const target = u.habilitado !== false ? 'inhabilitar' : 'habilitar';
    const ok = window.confirm(
      `¿Confirmás ${target} al especialista "${u.nombre ?? ''} ${u.apellido ?? ''}"?`
    );
    if (!ok) return;

    this.spinner.show();
    try {
      await this.usuarioService.updateHabilitado(u.uid, !(u.habilitado !== false));
      u.habilitado = !(u.habilitado !== false);
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

  // Paginación (faltaban)
  prevPage() {
    if (this.page() > 1) this.page.update((p) => p - 1);
  }
  nextPage() {
    const pages = Math.max(1, Math.ceil(this.total() / this.pageSize()));
    if (this.page() < pages) this.page.update((p) => p + 1);
  }
}
