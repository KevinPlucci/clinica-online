import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from '../toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toasts.html',
  styleUrls: ['./toasts.scss'],
})
export class ToastsComponent implements OnInit, OnDestroy {
  toasts = signal<Toast[]>([]);
  private timers = new Map<number, any>();

  constructor(private toastSvc: ToastService) {}

  ngOnInit(): void {
    this.toastSvc.toasts$.subscribe((t) => {
      this.toasts.update((list) => [...list, t]);
      const timer = setTimeout(() => this.dismiss(t.id), t.timeoutMs ?? 3500);
      this.timers.set(t.id, timer);
    });
  }

  ngOnDestroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  dismiss(id: number) {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.toasts.update((list) => list.filter((x) => x.id !== id));
  }

  icon(kind: Toast['kind']) {
    switch (kind) {
      case 'success':
        return '✔';
      case 'error':
        return '⚠';
      case 'info':
        return 'ℹ';
      case 'warning':
        return '!';
    }
  }
}
