import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(variant: ToastVariant, message: string, opts: { title?: string; duration?: number } = {}): number {
    const id = this.nextId++;
    const toast: Toast = {
      id,
      variant,
      message,
      title: opts.title,
      duration: opts.duration ?? 4000,
    };
    this._toasts.update((list) => [...list, toast]);
    if (toast.duration > 0) {
      setTimeout(() => this.dismiss(id), toast.duration);
    }
    return id;
  }

  success(message: string, title?: string): number { return this.show('success', message, { title }); }
  error(message: string, title?: string): number   { return this.show('error', message, { title, duration: 6000 }); }
  info(message: string, title?: string): number    { return this.show('info', message, { title }); }
  warning(message: string, title?: string): number { return this.show('warning', message, { title }); }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this._toasts.set([]);
  }
}
