import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  Notificacion,
  NotificacionesService,
} from '../../core/services/notificaciones.service';

/**
 * P1 §7 — Panel de notificaciones internas de la plataforma web.
 * El funcionario ve aquí cuándo un trámite llega a su área, alertas de SLA
 * vencido, riesgo de demora, etc. Marca leídas y navega al trámite.
 */
@Component({
  selector: 'app-notificaciones',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 class="h4 mb-0">Notificaciones</h1>
          <p class="text-muted small mb-0">
            Avisos del sistema: trámites que llegan a tu área, SLA, riesgo, documentos.
          </p>
        </div>
        <button class="btn btn-sm btn-outline-secondary" type="button" (click)="svc.refrescar()">
          Actualizar
        </button>
      </div>

      @if (svc.lista().length === 0) {
        <div class="card border-0 shadow-sm">
          <div class="card-body text-center text-muted py-5">No tienes notificaciones.</div>
        </div>
      } @else {
        <div class="list-group shadow-sm">
          @for (n of svc.lista(); track n.id) {
            <div
              class="list-group-item d-flex align-items-start gap-3"
              [class.bg-body-tertiary]="!n.leida"
            >
              <span class="badge mt-1" [class]="badgeDe(n)">{{ etiquetaDe(n) }}</span>
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between">
                  <strong [class.fw-normal]="n.leida">{{ n.titulo }}</strong>
                  <small class="text-muted ms-2 text-nowrap">
                    {{ n.fechaCreacion | date: 'dd/MM/yy HH:mm' }}
                  </small>
                </div>
                <div class="small text-body-secondary">{{ n.mensaje }}</div>
                <div class="mt-1 d-flex gap-3">
                  @if (esFuncionario() && n.tramiteId) {
                    <a
                      class="small text-decoration-none"
                      [routerLink]="['/funcionario/tramites', n.tramiteId]"
                      (click)="marcar(n)"
                    >
                      Ver trámite →
                    </a>
                  }
                  @if (!n.leida) {
                    <button
                      type="button"
                      class="btn btn-link btn-sm p-0 small text-decoration-none"
                      (click)="marcar(n)"
                    >
                      Marcar leída
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class NotificacionesComponent {
  readonly svc = inject(NotificacionesService);
  private readonly auth = inject(AuthService);

  readonly esFuncionario = computed(() => this.auth.isFuncionario());

  constructor() {
    this.svc.refrescar();
  }

  marcar(n: Notificacion): void {
    if (n.leida) return;
    this.svc.marcarLeida(n.id).subscribe({
      next: () => this.svc.refrescar(),
      error: () => {},
    });
  }

  badgeDe(n: Notificacion): string {
    switch (n.tipo) {
      case 'sla_vencido':
        return 'text-bg-danger';
      case 'riesgo_demora_alto':
        return 'text-bg-warning';
      case 'asignacion':
      case 'asignacion_auto':
        return 'text-bg-primary';
      case 'documento':
      case 'documentos_pendientes':
        return 'text-bg-info';
      case 'anomalia_detectada':
        return 'text-bg-warning';
      default:
        return 'text-bg-secondary';
    }
  }

  etiquetaDe(n: Notificacion): string {
    switch (n.tipo) {
      case 'sla_vencido':
        return 'SLA';
      case 'riesgo_demora_alto':
        return 'Riesgo';
      case 'asignacion':
      case 'asignacion_auto':
        return 'Bandeja';
      case 'documento':
      case 'documentos_pendientes':
        return 'Docs';
      case 'anomalia_detectada':
        return 'Anomalía';
      case 'cambio_estado':
        return 'Estado';
      default:
        return 'Aviso';
    }
  }
}
