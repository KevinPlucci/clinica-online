// src/app/app.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { SpinnerService } from './services/spinner.service';
import { SpinnerComponent } from './shared/spinner/spinner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SpinnerComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  title = 'clinica-online';

  private router = inject(Router);

  constructor(public spinnerSvc: SpinnerService) {
    // Loading también para transiciones de ruta (además del interceptor HTTP)
    this.router.events.subscribe((evt) => {
      if (evt instanceof NavigationStart) {
        this.spinnerSvc.show();
      }
      if (
        evt instanceof NavigationEnd ||
        evt instanceof NavigationCancel ||
        evt instanceof NavigationError
      ) {
        this.spinnerSvc.hide();
      }
    });
  }
}
