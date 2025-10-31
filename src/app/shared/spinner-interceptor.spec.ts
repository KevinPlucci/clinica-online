import { HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SpinnerService } from '../services/spinner.service';
import { SpinnerInterceptor } from './spinner-interceptor';

describe('SpinnerInterceptor (class-based)', () => {
  it('llama a show() al iniciar y hide() al finalizar', (done) => {
    const svc = new SpinnerService();
    const showSpy = spyOn(svc, 'show').and.callThrough();
    const hideSpy = spyOn(svc, 'hide').and.callThrough();

    const interceptor = new SpinnerInterceptor(svc);

    const handler: HttpHandler = {
      handle: (_req: HttpRequest<unknown>) => of(new HttpResponse({ status: 200, body: {} })),
    };

    interceptor
      .intercept(new HttpRequest('GET', '/api/test'), handler)
      .pipe(
        finalize(() => {
          expect(showSpy).toHaveBeenCalled();
          expect(hideSpy).toHaveBeenCalled();
          done();
        })
      )
      .subscribe();
  });
});
