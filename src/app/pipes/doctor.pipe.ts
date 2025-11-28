import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'doctor',
  standalone: true,
})
export class DoctorPipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return '';
    return `Dr./Dra. ${value}`;
  }
}
