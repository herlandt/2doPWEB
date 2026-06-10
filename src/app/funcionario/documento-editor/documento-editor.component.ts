import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  ColaboracionDocumentoRtService,
  DocumentoEventoRT,
} from '../../core/services/colaboracion-documento-rt.service';
import { DocumentoArchivoService } from '../../core/services/documento-archivo.service';

interface Participante {
  usuarioId: string;
  nombre?: string;
  color?: string;
  cursorPos?: number;
}

/**
 * CU-38 — Editor colaborativo de documentos en vivo.
 *
 * MVP simple (sin CRDT real):
 *  - `<textarea>` controlado.
 *  - Cambios locales se envían con debounce de 400ms como `{tipo: 'replace', contenido}`.
 *  - Los eventos remotos del mismo userId se ignoran (echo-suppression).
 *  - El backend retransmite a todos los suscriptores del topic.
 *  - Para snapshot final, usar el endpoint REST de "nueva versión" (CU-35).
 *
 * Limitación conocida: si dos personas escriben al mismo tiempo, gana
 * el último mensaje. Para edición conflictiva real se necesita Yjs/CRDT
 * (queda como mejora futura — el contrato STOMP del backend ya lo soporta).
 */
@Component({
  selector: 'app-documento-editor',
  imports: [RouterLink],
  templateUrl: './documento-editor.component.html',
  styleUrl: './documento-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentoEditorComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly rt = inject(ColaboracionDocumentoRtService);
  private readonly docSvc = inject(DocumentoArchivoService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly documentoId = this.route.snapshot.params['id'] as string;
  readonly miUserId = this.auth.getUserId();

  readonly contenido = signal('');
  readonly participantes = signal<Participante[]>([]);
  readonly conectado = signal(false);
  readonly mensaje = signal('');
  readonly mensajeTipo = signal<'info' | 'warning' | 'danger' | 'success'>('info');
  readonly ultimoEvento = signal<DocumentoEventoRT | null>(null);

  /** Contador de cambios recibidos del otro lado — útil para ver actividad. */
  readonly opsRemotas = signal(0);

  readonly soloLectura = signal(false);

  readonly otrosParticipantes = computed(() =>
    this.participantes().filter((p) => p.usuarioId !== this.miUserId),
  );

  private subEdicion: Subscription | null = null;
  private subPresencia: Subscription | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private joinTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (!this.isBrowser) return;
    if (!this.documentoId) {
      this.mensajeTipo.set('danger');
      this.mensaje.set('Falta documentoId en la URL.');
      return;
    }
    this.cargarDocumentoInfo();
    this.conectar();
  }

  // ── Conexión STOMP ──────────────────────────────────────────────────────

  private conectar(): void {
    // 1. Suscribir presencia
    this.subPresencia = this.rt
      .observarPresencia(this.documentoId)
      .subscribe({
        next: (ev) => this.onEventoPresencia(ev),
        error: () => this.aviso('warning', 'Conexión de presencia interrumpida.'),
      });

    // 2. Suscribir edición
    this.subEdicion = this.rt
      .observarEdicion(this.documentoId)
      .subscribe({
        next: (ev) => this.onEventoEdicion(ev),
        error: () => this.aviso('warning', 'Conexión de edición interrumpida.'),
      });

    // 3. Anunciar JOIN tras un microtick para que las suscripciones estén activas
    this.joinTimer = setTimeout(() => {
      this.rt.publicarJoin(this.documentoId);
      this.conectado.set(true);
      this.aviso('success', 'Conectado a la sesión colaborativa.');
    }, 250);
  }

  private cargarDocumentoInfo(): void {
    // Para informativo: nombre del documento, versión actual.
    // Si falla, no es crítico — la sesión sigue.
    this.docSvc.preview(this.documentoId).subscribe({
      next: () => {
        // OK — documento existe
      },
      error: (err) => {
        if (err?.status === 403) {
          this.soloLectura.set(true);
          this.aviso('warning', 'Sin permiso de edición. Modo solo-lectura.');
        }
      },
    });
  }

  // ── Eventos entrantes ───────────────────────────────────────────────────

  private onEventoPresencia(ev: DocumentoEventoRT): void {
    this.ultimoEvento.set(ev);
    if (ev.tipo === 'roster') {
      const payload = ev.payload as { participantes?: Participante[] };
      this.participantes.set(payload?.participantes ?? []);
    } else if (ev.tipo === 'kick') {
      this.soloLectura.set(true);
      this.aviso('danger', 'Has sido expulsado de la sesión (permiso revocado o sesión llena).');
    } else if (ev.tipo === 'cursor') {
      // Actualizar cursor de un participante específico
      const payload = ev.payload as { cursorPos?: number };
      if (ev.autorId && typeof payload?.cursorPos === 'number') {
        this.participantes.update((lista) =>
          lista.map((p) =>
            p.usuarioId === ev.autorId ? { ...p, cursorPos: payload.cursorPos } : p,
          ),
        );
      }
    }
  }

  private onEventoEdicion(ev: DocumentoEventoRT): void {
    // SNAPSHOT (al unirse alguien): el servidor manda el contenido vivo de la
    // sesión. Se procesa ANTES del echo-suppression porque el autor del snapshot
    // es el que se une (yo mismo, en mi join). Solo se aplica sobre un editor
    // VACÍO: el componente siempre arranca vacío (el join snapshot entra), y así
    // nunca pisa texto ya tecleado (ni en la ventana pre-join ni en otra pestaña).
    if (ev.tipo === 'snapshot') {
      const payload = ev.payload as { contenido?: string };
      if (typeof payload?.contenido === 'string' && payload.contenido && !this.contenido()) {
        this.contenido.set(payload.contenido);
      }
      return;
    }

    // Echo-suppression: ignoro mis propias ops
    if (ev.autorId === this.miUserId) return;
    if (ev.tipo !== 'op') return;

    this.opsRemotas.update((n) => n + 1);

    const payload = ev.payload as { tipo?: string; contenido?: string };
    if (payload?.tipo === 'replace' && typeof payload.contenido === 'string') {
      this.contenido.set(payload.contenido);
    }
  }

  // ── Cambios locales ─────────────────────────────────────────────────────

  onTextareaInput(ev: Event): void {
    if (this.soloLectura()) return;
    const valor = (ev.target as HTMLTextAreaElement).value;
    this.contenido.set(valor);

    // Debounce 400ms — evitamos saturar el WS con cada tecla
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.rt.publicarOp(this.documentoId, { tipo: 'replace', contenido: valor });
    }, 400);
  }

  onTextareaSelect(ev: Event): void {
    if (!this.conectado()) return;
    const pos = (ev.target as HTMLTextAreaElement).selectionStart ?? 0;
    this.rt.publicarCursor(this.documentoId, pos);
  }

  readonly guardandoVersion = signal(false);

  /**
   * Persiste el contenido colaborativo como NUEVA VERSIÓN del documento (CU-35):
   * cierra el ciclo "lo editado en vivo queda en el documento real".
   */
  guardarComoNuevaVersion(): void {
    const texto = this.contenido();
    if (!texto.trim() || this.guardandoVersion()) return;
    this.guardandoVersion.set(true);
    const archivo = new File([texto], 'edicion-colaborativa.txt', { type: 'text/plain' });
    this.docSvc.nuevaVersion(this.documentoId, archivo, 'Edición colaborativa en vivo (CU-38)').subscribe({
      next: () => {
        this.guardandoVersion.set(false);
        this.aviso('success', 'Contenido guardado como nueva versión del documento.');
      },
      error: () => {
        this.guardandoVersion.set(false);
        this.aviso('danger', 'No se pudo guardar la nueva versión.');
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private aviso(tipo: 'info' | 'warning' | 'danger' | 'success', texto: string): void {
    this.mensajeTipo.set(tipo);
    this.mensaje.set(texto);
    if (tipo === 'success') {
      setTimeout(() => this.mensaje.set(''), 3000);
    }
  }

  /** Inicial del participante para el avatar circular. */
  inicial(p: Participante): string {
    const n = (p.nombre || p.usuarioId || '?').trim();
    return n.charAt(0).toUpperCase() || '?';
  }

  bgAvatar(p: Participante): string {
    // Color pseudoaleatorio basado en el userId, para consistencia.
    const colores = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899'];
    let h = 0;
    for (let i = 0; i < (p.usuarioId || '').length; i++) {
      h = (h * 31 + p.usuarioId.charCodeAt(i)) >>> 0;
    }
    return colores[h % colores.length];
  }

  ngOnDestroy(): void {
    if (this.joinTimer) {
      clearTimeout(this.joinTimer);
      this.joinTimer = null;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.documentoId && this.isBrowser) {
      try {
        this.rt.publicarLeave(this.documentoId);
      } catch {
        // ignore
      }
    }
    this.subEdicion?.unsubscribe();
    this.subPresencia?.unsubscribe();
  }
}
