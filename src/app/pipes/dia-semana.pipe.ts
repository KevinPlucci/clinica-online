import { Pipe, PipeTransform } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';

@Pipe({
  name: 'diaSemana',
  standalone: true,
})
export class DiaSemanaPipe implements PipeTransform {
  transform(fecha: Date | Timestamp | string): string {
    if (!fecha) return '-';

    let dateObj: Date;
    if (fecha instanceof Timestamp) {
      dateObj = fecha.toDate();
    } else {
      dateObj = new Date(fecha);
    }

    // Array de días en español
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dateObj.getDay()];
  }
}
