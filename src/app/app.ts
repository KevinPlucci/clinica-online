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
import { fadeAnimation, slideInAnimation } from './animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SpinnerComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  animations: [fadeAnimation, slideInAnimation],
})
export class AppComponent {
  title = 'clinica-online';

  private router = inject(Router);

  constructor(public spinnerSvc: SpinnerService) {
    this.router.events.subscribe((evt) => {
      if (evt instanceof NavigationStart) {
        // FIX NG0100: Usamos setTimeout para diferir la actualización
        setTimeout(() => this.spinnerSvc.show(), 0);
      }
      if (
        evt instanceof NavigationEnd ||
        evt instanceof NavigationCancel ||
        evt instanceof NavigationError
      ) {
        // FIX NG0100: Usamos setTimeout aquí también
        setTimeout(() => this.spinnerSvc.hide(), 0);
      }
    });
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}
