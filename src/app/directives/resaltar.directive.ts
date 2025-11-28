import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appResaltar]',
  standalone: true,
})
export class ResaltarDirective {
  @Input() colorBase = '';
  @Input() colorResaltado = '#dbeafe'; // Azul claro por defecto

  constructor(private el: ElementRef) {}

  @HostListener('mouseenter') onMouseEnter() {
    this.resaltar(this.colorResaltado);
    this.el.nativeElement.style.transform = 'scale(1.02)';
    this.el.nativeElement.style.transition = 'all 0.2s';
    this.el.nativeElement.style.cursor = 'pointer';
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.resaltar(this.colorBase);
    this.el.nativeElement.style.transform = 'scale(1)';
  }

  private resaltar(color: string) {
    this.el.nativeElement.style.backgroundColor = color;
  }
}
