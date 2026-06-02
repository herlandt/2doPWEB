import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
  AfterViewChecked,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideAngularModule, MessageCircle, X, Send, Bot, ArrowRight } from 'lucide-angular';
import { AgenteService, AgenteAccion } from '../../core/services/agente.service';
import { AuthService } from '../../core/services/auth.service';

interface ChatMessage {
  text: string;
  fromUser: boolean;
  action?: AgenteAccion | null;
  fuente?: string;
}

@Component({
  selector: 'app-agente-flotante',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './agente-flotante.component.html',
  styleUrl: './agente-flotante.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgenteFlotanteComponent implements AfterViewChecked {
  private readonly agente = inject(AgenteService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('scrollBox') private scrollBox?: ElementRef<HTMLDivElement>;

  protected readonly icons = {
    chat: MessageCircle,
    close: X,
    send: Send,
    bot: Bot,
    arrow: ArrowRight,
  };

  protected readonly abierto = signal(false);
  protected readonly cargando = signal(false);
  protected readonly mensajes = signal<ChatMessage[]>([]);
  protected readonly consulta = signal('');

  protected readonly visible = computed(() => !!this.auth.usuario());

  private currentRoute = '/';
  private autoScroll = false;

  constructor() {
    this.currentRoute = this.router.url || '/';
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.currentRoute = (e as NavigationEnd).urlAfterRedirects;
      });
  }

  ngAfterViewChecked(): void {
    if (this.autoScroll && this.scrollBox) {
      const el = this.scrollBox.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.autoScroll = false;
    }
  }

  protected toggle(): void {
    const next = !this.abierto();
    this.abierto.set(next);
    if (next && this.mensajes().length === 0) {
      this.mensajes.set([
        {
          text: this.saludoContextual(),
          fromUser: false,
        },
      ]);
      this.autoScroll = true;
    }
  }

  protected enviar(): void {
    const texto = this.consulta().trim();
    if (!texto || this.cargando()) return;

    this.mensajes.update((m) => [...m, { text: texto, fromUser: true }]);
    this.consulta.set('');
    this.cargando.set(true);
    this.autoScroll = true;

    const tramiteId = this.extraerTramiteId(this.currentRoute);

    this.agente
      .consultar({
        consulta: texto,
        moduloActivo: this.currentRoute,
        tramiteIdOpcional: tramiteId,
      })
      .subscribe({
        next: (res) => {
          this.mensajes.update((m) => [
            ...m,
            {
              text: res.respuesta,
              fromUser: false,
              action: res.accion ?? null,
              fuente: res.fuente,
            },
          ]);
          this.cargando.set(false);
          this.autoScroll = true;
        },
        error: () => {
          this.mensajes.update((m) => [
            ...m,
            {
              text: 'Asistente no disponible temporalmente. Intenta de nuevo en un momento.',
              fromUser: false,
            },
          ]);
          this.cargando.set(false);
          this.autoScroll = true;
        },
      });
  }

  protected ejecutarAccion(accion: AgenteAccion): void {
    if (!accion) return;
    if (accion.tipo === 'navegar' && accion.ruta) {
      this.router.navigateByUrl(accion.ruta);
      this.abierto.set(false);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  private saludoContextual(): string {
    const ruta = this.currentRoute.toLowerCase();
    const rol = this.auth.getRol();
    if (ruta.includes('/diagrama')) {
      return `Hola, estás en diseño de flujos. ¿Necesitas ayuda para agregar un nodo o un fork paralelo?`;
    }
    if (ruta.includes('/expediente')) {
      return `Hola, estás revisando un expediente. Solo puedes editar tu sección activa. ¿Te explico cómo dictar por voz?`;
    }
    if (ruta.includes('/metricas') || ruta.includes('/dashboard')) {
      return `Hola, estás viendo métricas. Puedo explicarte los cuellos de botella detectados.`;
    }
    if (ruta.includes('/tramite')) {
      return `Hola, estás en trámites. ¿Quieres consultar el estado de uno o iniciar uno nuevo?`;
    }
    return `Hola${rol ? ' (' + rol + ')' : ''}, soy tu asistente del sistema de trámites. ¿En qué puedo ayudarte?`;
  }

  private extraerTramiteId(ruta: string): string | null {
    const m = ruta.match(/\/(?:tramite[s]?|expediente)\/([a-f0-9-]{8,})/i);
    return m ? m[1] : null;
  }
}
