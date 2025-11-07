import { Pipe, PipeTransform } from '@angular/core';
import { Turno } from '../models/turno';
import { Usuario } from '../models/usuario';

@Pipe({
  name: 'filtroTurnos',
  standalone: true,
})
export class FiltroTurnosPipe implements PipeTransform {
  transform(
    turnos: Turno[] | null,
    filtro: string,
    rol: Usuario['rol'] | 'admin' // Aceptamos 'admin'
  ): Turno[] {
    if (!turnos) return [];
    if (!filtro) return turnos;

    const term = filtro.toLowerCase();

    return turnos.filter((t) => {
      // Campos comunes para filtrar
      if (t.especialidad.toLowerCase().includes(term)) return true;
      if (t.estado.toLowerCase().includes(term)) return true;

      // +++ INICIO MODIFICACIÓN +++
      // Filtros específicos por rol
      if (rol === 'paciente') {
        if (t.especialistaNombre.toLowerCase().includes(term)) return true;
      } else if (rol === 'especialista') {
        if (t.pacienteNombre.toLowerCase().includes(term)) return true;
      } else if (rol === 'admin') {
        // Admin puede buscar por ambos
        if (t.especialistaNombre.toLowerCase().includes(term)) return true;
        if (t.pacienteNombre.toLowerCase().includes(term)) return true;
      }
      // +++ FIN MODIFICACIÓN +++

      return false;
    });
  }
}
