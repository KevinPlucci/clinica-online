import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { BienvenidaComponent } from './bienvenida';
import { AuthService } from '../../services/auth.service';

class AuthServiceStub {
  // simula el usuario de Firebase: null = deslogueado, {} = logueado
  authUser$ = new BehaviorSubject<any>(null);
  isAdmin$ = new BehaviorSubject<boolean>(false);
}

describe('BienvenidaComponent (smoke/yellow)', () => {
  let fixture: ComponentFixture<BienvenidaComponent>;
  let component: BienvenidaComponent;
  let authStub: AuthServiceStub;

  beforeEach(async () => {
    authStub = new AuthServiceStub();

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, BienvenidaComponent],
      providers: [{ provide: AuthService, useValue: authStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(BienvenidaComponent);
    component = fixture.componentInstance;
  });

  it('muestra links a /login y /registro cuando NO está logueado', () => {
    authStub.authUser$.next(null); // no logueado
    authStub.isAdmin$.next(false);

    fixture.detectChanges();

    const anchors = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>
    ).map((a) => a.getAttribute('ng-reflect-router-link'));

    expect(anchors).toContain('/login');
    expect(anchors).toContain('/registro');
  });

  it('muestra "Ir al panel" cuando está logueado no-admin', () => {
    authStub.authUser$.next({ uid: 'u1' }); // logueado
    authStub.isAdmin$.next(false);

    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.btn-primary');
    expect(link?.textContent?.trim()).toBe('Ir al panel');
    // fallback de destino cuando no es admin (misma bienvenida o dashboard futuro)
    const refl = link?.getAttribute('ng-reflect-router-link');
    expect(refl === '/bienvenida' || refl === '/dashboard').toBeTrue();
  });

  it('muestra "Ir al panel" a /admin/usuarios cuando es admin', () => {
    authStub.authUser$.next({ uid: 'admin-1' });
    authStub.isAdmin$.next(true);

    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.btn-primary');
    expect(link?.textContent?.trim()).toBe('Ir al panel');
    expect(link?.getAttribute('ng-reflect-router-link')).toBe('/admin/usuarios');
  });
});
