import { Pipe, PipeTransform } from '@angular/core';
// +++ CAMBIO: Importamos las nuevas interfaces +++
import { Turno, HistoriaClinica } from '../models/turno';

/**
 * Función helper para buscar dentro de la Historia Clínica
 */
function checkHistoria(hc: HistoriaClinica | undefined, term: string): boolean {
  if (!hc) return false;

  // Buscar en campos fijos
  if (String(hc.altura).toLowerCase().includes(term)) return true;
  if (String(hc.peso).toLowerCase().includes(term)) return true;
  if (String(hc.temperatura).toLowerCase().includes(term)) return true;
  if (hc.presion.toLowerCase().includes(term)) return true;

  // Buscar en campos dinámicos (clave y valor)
  if (
    hc.datosDinamicos.some(
      (d) => d.clave.toLowerCase().includes(term) || d.valor.toLowerCase().includes(term)
    )
  ) {
    return true;
  }

  return false;
}

@Pipe({
  name: 'filtroTurnos',
  standalone: true,
})
export class FiltroTurnosPipe implements PipeTransform {
  // +++ MODIFICADO: Quitamos el parámetro 'rol', ya no se necesita +++
  transform(turnos: Turno[] | null, filtro: string): Turno[] {
    if (!turnos) return [];
    if (!filtro) return turnos;

    const term = filtro.toLowerCase();

    return turnos.filter((t) => {
      // +++ FILTRO UNIVERSAL +++

      // Campos de texto principales
      if (t.especialidad.toLowerCase().includes(term)) return true;
      if (t.estado.toLowerCase().includes(term)) return true;
      if (t.pacienteNombre.toLowerCase().includes(term)) return true;
      if (t.especialistaNombre.toLowerCase().includes(term)) return true;

      // Buscar en fecha (formato local)
      if (t.fecha.toDate().toLocaleString('es-AR').includes(term)) return true;

      // Campos de comentarios y motivos
      if (t.comentario?.toLowerCase().includes(term)) return true;
      if (t.motivoCancelacion?.toLowerCase().includes(term)) return true;

      // Buscar en Historia Clínica (usando el helper)
      if (checkHistoria(t.historiaClinica, term)) return true;

      // Buscar en datos de encuesta (si es un objeto simple)
      if (t.encuestaData && typeof t.encuestaData.respuesta === 'string') {
        if (t.encuestaData.respuesta.toLowerCase().includes(term)) return true;
      }

      return false;
    });
  }
}
