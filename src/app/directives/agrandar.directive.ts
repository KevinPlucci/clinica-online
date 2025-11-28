import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appAgrandar]',
  standalone: true,
})
export class AgrandarDirective {
  constructor(private el: ElementRef) {
    el.nativeElement.style.transition = 'font-size 0.2s';
  }

  @HostListener('mouseenter') onMouseEnter() {
    this.el.nativeElement.style.fontSize = '1.1em';
    this.el.nativeElement.style.fontWeight = 'bold';
    this.el.nativeElement.style.color = '#1e3a8a';
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.el.nativeElement.style.fontSize = '1em';
    this.el.nativeElement.style.fontWeight = 'normal';
    this.el.nativeElement.style.color = 'inherit';
  }
}
