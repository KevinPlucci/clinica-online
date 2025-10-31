// src/app/shared/toast.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  timeoutMs?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 1;
  private stream = new Subject<Toast>();
  toasts$ = this.stream.asObservable();

  show(kind: ToastKind, message: string, timeoutMs = 3500) {
    const t: Toast = { id: this.seq++, kind, message, timeoutMs };
    this.stream.next(t);
  }
  success(msg: string, ms = 3500) {
    this.show('success', msg, ms);
  }
  error(msg: string, ms = 4500) {
    this.show('error', msg, ms);
  }
  info(msg: string, ms = 3500) {
    this.show('info', msg, ms);
  }
  warning(msg: string, ms = 3500) {
    this.show('warning', msg, ms);
  }
}
