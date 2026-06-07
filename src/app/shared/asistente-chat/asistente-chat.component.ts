import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgenteService, AgenteAccion } from '../../core/services/agente.service';
import { AuthService } from '../../core/services/auth.service';
import { mensajeAmigable } from '../../core/utils/error-messages';

/** Un mensaje dentro del hilo de chat. */
interface ChatMensaje {
  texto: string;
  delUsuario: boolean;
  accion?: AgenteAccion | null;
}

/**
 * Chat flotante del asistente IA para la WEB (admin y funcionario).
 *
 * Es el equivalente web del chat del móvil: un FAB redondo abajo-derecha que
 * abre/cierra un panel de chat. Sólo es visible cuando hay sesión iniciada, por
 * lo que aparece en todo /admin y /funcionario y nunca en /login.
 */
@Component({
  selector: 'app-asistente-chat',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <!-- Botón flotante (FAB) -->
      <button
        type="button"
        class="ac-fab"
        (click)="toggle()"
        [attr.aria-label]="abierto() ? 'Cerrar asistente' : 'Abrir asistente'"
        [attr.aria-expanded]="abierto()"
      >
        @if (abierto()) {
          <!-- ícono cerrar -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" />
          </svg>
        } @else {
          <!-- ícono robot -->
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor"
              stroke-width="2" />
            <path d="M12 4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <circle cx="12" cy="4" r="1.4" fill="currentColor" />
            <circle cx="9" cy="13" r="1.3" fill="currentColor" />
            <circle cx="15" cy="13" r="1.3" fill="currentColor" />
            <path d="M2 12v3M22 12v3" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" />
          </svg>
        }
      </button>

      <!-- Panel de chat -->
      @if (abierto()) {
        <section class="ac-panel" role="dialog" aria-label="Asistente">
          <header class="ac-panel__header">
            <span class="ac-panel__title">Asistente</span>
            <button
              type="button"
              class="ac-panel__close"
              (click)="cerrar()"
              aria-label="Cerrar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" />
              </svg>
            </button>
          </header>

          <div #scrollBox class="ac-panel__body">
            @for (m of mensajes(); track $index) {
              <div class="ac-row" [class.ac-row--user]="m.delUsuario">
                <div
                  class="ac-bubble"
                  [class.ac-bubble--user]="m.delUsuario"
                  [class.ac-bubble--bot]="!m.delUsuario"
                >
                  {{ m.texto }}
                </div>
                @if (!m.delUsuario && m.accion?.ruta) {
                  <button
                    type="button"
                    class="ac-accion"
                    (click)="ejecutarAccion(m.accion!)"
                  >
                    {{ m.accion?.label || 'Ir' }}
                  </button>
                }
              </div>
            }
            @if (cargando()) {
              <div class="ac-row">
                <div class="ac-bubble ac-bubble--bot ac-bubble--typing">escribiendo…</div>
              </div>
            }
          </div>

          <form
            class="ac-panel__input"
            (submit)="$event.preventDefault(); enviar()"
          >
            <input
              type="text"
              class="form-control"
              placeholder="Escribe tu consulta…"
              [ngModel]="consulta()"
              (ngModelChange)="consulta.set($event)"
              (keydown)="onKeydown($event)"
              name="consulta"
              autocomplete="off"
              [disabled]="cargando()"
            />
            <button
              type="submit"
              class="ac-send"
              [disabled]="cargando() || !consulta().trim()"
              aria-label="Enviar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12l16-8-6 16-3-6-7-2z" stroke="currentColor" stroke-width="2"
                  stroke-linejoin="round" />
              </svg>
            </button>
          </form>
        </section>
      }
    }
  `,
  styles: [
    `
      :host {
        --ac-morado: #6a1b9a;
        --ac-morado-700: #571579;
      }

      .ac-fab {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: var(--ac-morado);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(106, 27, 154, 0.4);
        z-index: 1080;
        transition: background 0.15s ease, transform 0.15s ease;
      }
      .ac-fab:hover {
        background: var(--ac-morado-700);
        transform: translateY(-1px);
      }

      .ac-panel {
        position: fixed;
        right: 24px;
        bottom: 92px;
        width: 360px;
        max-width: calc(100vw - 32px);
        height: 480px;
        max-height: calc(100vh - 120px);
        display: flex;
        flex-direction: column;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        z-index: 1080;
      }

      .ac-panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--ac-morado);
        color: #fff;
      }
      .ac-panel__title {
        font-weight: 600;
        font-size: 1rem;
      }
      .ac-panel__close {
        border: none;
        background: transparent;
        color: #fff;
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 2px;
        border-radius: 6px;
      }
      .ac-panel__close:hover {
        background: rgba(255, 255, 255, 0.18);
      }

      .ac-panel__body {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #f7f5fa;
      }

      .ac-row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      .ac-row--user {
        align-items: flex-end;
      }

      .ac-bubble {
        max-width: 85%;
        padding: 9px 12px;
        border-radius: 14px;
        font-size: 0.9rem;
        line-height: 1.35;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .ac-bubble--bot {
        background: #fff;
        color: #1f2330;
        border: 1px solid #e6e1ee;
        border-bottom-left-radius: 4px;
      }
      .ac-bubble--user {
        background: var(--ac-morado);
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .ac-bubble--typing {
        color: #6b7280;
        font-style: italic;
      }

      .ac-accion {
        border: 1px solid var(--ac-morado);
        background: #fff;
        color: var(--ac-morado);
        font-size: 0.82rem;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 999px;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .ac-accion:hover {
        background: var(--ac-morado);
        color: #fff;
      }

      .ac-panel__input {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-top: 1px solid #ece8f2;
        background: #fff;
      }
      .ac-panel__input .form-control {
        flex: 1 1 auto;
      }
      .ac-panel__input .form-control:focus {
        border-color: var(--ac-morado);
        box-shadow: 0 0 0 0.2rem rgba(106, 27, 154, 0.2);
      }

      .ac-send {
        flex: 0 0 auto;
        width: 40px;
        height: 38px;
        border: none;
        border-radius: 8px;
        background: var(--ac-morado);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .ac-send:hover:not(:disabled) {
        background: var(--ac-morado-700);
      }
      .ac-send:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AsistenteChatComponent implements AfterViewChecked {
  private readonly agente = inject(AgenteService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly scrollBox = viewChild<ElementRef<HTMLDivElement>>('scrollBox');

  protected readonly abierto = signal(false);
  protected readonly cargando = signal(false);
  protected readonly consulta = signal('');
  protected readonly mensajes = signal<ChatMensaje[]>([]);

  /** Sólo visible con sesión activa (todo /admin y /funcionario). */
  protected readonly visible = computed(() => !!this.auth.usuario());

  private autoScroll = false;

  ngAfterViewChecked(): void {
    if (this.autoScroll) {
      const el = this.scrollBox()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
      this.autoScroll = false;
    }
  }

  protected toggle(): void {
    const abrir = !this.abierto();
    this.abierto.set(abrir);
    if (abrir && this.mensajes().length === 0) {
      this.mensajes.set([
        {
          texto: 'Hola, soy tu asistente. ¿En qué puedo ayudarte?',
          delUsuario: false,
        },
      ]);
      this.autoScroll = true;
    }
  }

  protected cerrar(): void {
    this.abierto.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  protected enviar(): void {
    const texto = this.consulta().trim();
    if (!texto || this.cargando()) {
      return;
    }

    this.mensajes.update((m) => [...m, { texto, delUsuario: true }]);
    this.consulta.set('');
    this.cargando.set(true);
    this.autoScroll = true;

    this.agente.consultar(texto, this.router.url).subscribe({
      next: (res) => {
        this.mensajes.update((m) => [
          ...m,
          {
            texto: res.respuesta,
            delUsuario: false,
            accion: res.accion ?? null,
          },
        ]);
        this.cargando.set(false);
        this.autoScroll = true;
      },
      error: (err: unknown) => {
        this.mensajes.update((m) => [
          ...m,
          { texto: mensajeAmigable(err), delUsuario: false },
        ]);
        this.cargando.set(false);
        this.autoScroll = true;
      },
    });
  }

  protected ejecutarAccion(accion: AgenteAccion): void {
    if (!accion?.ruta) {
      return;
    }
    this.router.navigate([accion.ruta]);
    this.cerrar();
  }
}
