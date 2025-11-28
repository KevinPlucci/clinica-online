import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SpinnerService {
  public isLoading = new BehaviorSubject<boolean>(false);

  constructor() {}

  show() {
    // FIX DEFINITIVO NG0100: Usamos setTimeout para sacar la actualización del ciclo actual
    setTimeout(() => {
      this.isLoading.next(true);
    }, 0);
  }

  hide() {
    setTimeout(() => {
      this.isLoading.next(false);
    }, 0);
  }
}
