import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';

/**
 * Widget reutilizable para grabar voz vía `MediaRecorder` (CU-39).
 *
 * - Pide permiso de micrófono al primer click en "Grabar".
 * - Emite el `Blob` por el output `(audioGrabado)` cuando termina.
 * - Bloqueado en SSR (sin `navigator.mediaDevices`).
 *
 * Uso:
 *   <app-grabador-voz (audioGrabado)="onAudio($event)" />
 */
@Component({
  selector: 'app-grabador-voz',
  imports: [],
  template: `
    <div class="d-flex align-items-center gap-2 flex-wrap">
      @if (!soportado()) {
        <span class="badge bg-secondary">Tu navegador no soporta grabación.</span>
      } @else {
        @if (estado() === 'inactivo') {
          <button type="button" class="btn btn-sm btn-outline-primary" (click)="iniciar()">
            🎙️ Grabar
          </button>
        } @else if (estado() === 'pidiendo-permiso') {
          <button type="button" class="btn btn-sm btn-outline-primary" disabled>
            Solicitando micrófono…
          </button>
        } @else if (estado() === 'grabando') {
          <button type="button" class="btn btn-sm btn-danger" (click)="detener()">
            ⏹ Detener · {{ duracion() }}s
          </button>
          <span class="text-danger small fw-bold">● Grabando</span>
        } @else if (estado() === 'subiendo') {
          <button type="button" class="btn btn-sm btn-secondary" disabled>
            <span class="spinner-border spinner-border-sm me-1"></span>
            Procesando…
          </button>
        }

        @if (error()) {
          <span class="text-danger small">{{ error() }}</span>
        }
      }
    </div>
  `,
  styles: [`:host { display: inline-block; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrabadorVozComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Emite el blob de audio cuando termina la grabación. */
  readonly audioGrabado = output<Blob>();

  readonly estado = signal<'inactivo' | 'pidiendo-permiso' | 'grabando' | 'subiendo'>(
    'inactivo',
  );
  readonly error = signal('');
  readonly duracion = signal(0);

  readonly soportado = computed(() => {
    if (!this.isBrowser) return false;
    return typeof navigator !== 'undefined'
      && !!navigator.mediaDevices
      && typeof MediaRecorder !== 'undefined';
  });

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timerId: ReturnType<typeof setInterval> | null = null;
  private inicio = 0;

  async iniciar(): Promise<void> {
    if (!this.soportado()) return;
    this.error.set('');
    this.estado.set('pidiendo-permiso');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = this.elegirMime();
      this.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.chunks = [];

      this.recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
      };
      this.recorder.onstop = () => {
        // Detener los tracks para liberar el micrófono / quitar el indicador del navegador
        stream.getTracks().forEach((t) => t.stop());
        if (this.chunks.length === 0) {
          this.estado.set('inactivo');
          this.error.set('No se capturó audio.');
          return;
        }
        const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' });
        this.estado.set('subiendo');
        this.audioGrabado.emit(blob);
      };

      this.recorder.start();
      this.inicio = Date.now();
      this.duracion.set(0);
      this.timerId = setInterval(() => {
        this.duracion.set(Math.floor((Date.now() - this.inicio) / 1000));
      }, 250);
      this.estado.set('grabando');
    } catch (e: unknown) {
      this.estado.set('inactivo');
      const msg = e instanceof Error ? e.message : 'No se pudo acceder al micrófono.';
      this.error.set(msg.includes('Permission') || msg.includes('denied')
        ? 'Permiso de micrófono denegado.'
        : msg);
    }
  }

  detener(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    try {
      this.recorder?.stop();
    } catch {
      // ignore
    }
  }

  /** Llamado desde el padre cuando termina de procesar el upload. */
  liberar(): void {
    this.estado.set('inactivo');
    this.duracion.set(0);
    this.chunks = [];
    this.recorder = null;
  }

  private elegirMime(): string | undefined {
    const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const m of opts) {
      if (MediaRecorder.isTypeSupported(m)) return m;
    }
    return undefined;
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    try {
      if (this.recorder?.state === 'recording') this.recorder.stop();
    } catch {
      // ignore
    }
  }
}
