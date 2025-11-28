import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appColorEstado]',
  standalone: true,
})
export class ColorEstadoDirective implements OnChanges {
  @Input('appColorEstado') estado = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges() {
    let color = '#64748b'; // Gris por defecto
    let bg = '#f1f5f9';

    switch (this.estado?.toLowerCase()) {
      case 'pendiente':
        color = '#d97706';
        bg = '#fef3c7';
        break; // Amarillo
      case 'aceptado':
        color = '#2563eb';
        bg = '#dbeafe';
        break; // Azul
      case 'realizado':
        color = '#16a34a';
        bg = '#dcfce7';
        break; // Verde
      case 'cancelado':
      case 'rechazado':
        color = '#dc2626';
        bg = '#fee2e2';
        break; // Rojo
    }

    this.renderer.setStyle(this.el.nativeElement, 'color', color);
    this.renderer.setStyle(this.el.nativeElement, 'backgroundColor', bg);
    this.renderer.setStyle(this.el.nativeElement, 'padding', '4px 8px');
    this.renderer.setStyle(this.el.nativeElement, 'borderRadius', '4px');
    this.renderer.setStyle(this.el.nativeElement, 'fontWeight', '600');
    this.renderer.setStyle(this.el.nativeElement, 'fontSize', '0.85rem');
    this.renderer.setStyle(this.el.nativeElement, 'textTransform', 'capitalize');
  }
}
