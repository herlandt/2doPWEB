import { inject, Injectable } from '@angular/core';
import { RxStomp, RxStompConfig } from '@stomp/rx-stomp';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Forma del payload que llega del backend. Debe coincidir con DiagramaEvento.java */
export interface DiagramaEventoRT {
  tipo:
    | 'nodo-creado'
    | 'nodo-actualizado'
    | 'nodo-eliminado'
    | 'trans-creada'
    | 'trans-actualizada'
    | 'trans-eliminada';
  diagramaId: string;
  payload: unknown;
  autorId?: string | null;
  timestamp: number;
}

/**
 * Cliente STOMP para la colaboración en tiempo real del diagramador (CU-15).
 *
 * Uso típico en un componente:
 *   const sub = this.rt.observarDiagrama(diagramaId).subscribe(...);
 *   // El servicio se desconecta automáticamente cuando ya no quedan suscriptores.
 *
 * El servicio reutiliza una única conexión RxStomp con auto-reconexión.
 * El JWT se pasa como query string `?token=...` porque WebSocket en el navegador
 * no admite cabeceras personalizadas en el handshake.
 */
@Injectable({ providedIn: 'root' })
export class ColaboracionRtService {
  private readonly auth = inject(AuthService);
  private rx: RxStomp | null = null;
  private suscriptoresPorDiagrama = new Map<string, number>();

  /** Devuelve un Observable que emite cada vez que cambia el diagrama indicado. */
  observarDiagrama(diagramaId: string): Observable<DiagramaEventoRT> {
    const topic = `/topic/diagramas/${diagramaId}`;
    return new Observable<DiagramaEventoRT>((subscriber) => {
      this.asegurarConexion();
      const cuenta = this.suscriptoresPorDiagrama.get(diagramaId) ?? 0;
      this.suscriptoresPorDiagrama.set(diagramaId, cuenta + 1);

      const sub = this.rx!.watch(topic)
        .pipe(map((msg) => JSON.parse(msg.body) as DiagramaEventoRT))
        .subscribe({
          next: (e) => subscriber.next(e),
          error: (err) => subscriber.error(err),
        });

      return () => {
        sub.unsubscribe();
        const restante = (this.suscriptoresPorDiagrama.get(diagramaId) ?? 1) - 1;
        if (restante <= 0) {
          this.suscriptoresPorDiagrama.delete(diagramaId);
        } else {
          this.suscriptoresPorDiagrama.set(diagramaId, restante);
        }
        // Si nadie está observando ningún diagrama, cerramos la conexión.
        if (this.suscriptoresPorDiagrama.size === 0) {
          this.desconectar();
        }
      };
    });
  }

  private asegurarConexion(): void {
    if (this.rx?.active) return;

    const wsBase = environment.apiUrl.replace(/^http/i, 'ws').replace(/\/api\/?$/, '');

    const cfg: RxStompConfig = {
      brokerURL: `${wsBase}/ws`,
      reconnectDelay: 3000,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      // En CADA (re)conexión leemos el token vigente y lo fijamos en la URL,
      // de modo que tras refresh/re-login no se reutilice un token caducado.
      beforeConnect: (client) => {
        const token = this.auth.getToken() ?? '';
        client.configure({ brokerURL: `${wsBase}/ws?token=${encodeURIComponent(token)}` });
      },
    };

    this.rx = new RxStomp();
    this.rx.configure(cfg);
    this.rx.activate();
  }

  private desconectar(): void {
    if (!this.rx) return;
    try {
      void this.rx.deactivate();
    } catch {
      /* ignore */
    }
    this.rx = null;
  }

  /** Útil cuando se cierra sesión: cierra la conexión incluso si quedan refs. */
  forzarCierre(): void {
    this.suscriptoresPorDiagrama.clear();
    this.desconectar();
  }
}
