import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MetricasService } from '../../core/services/metricas.service';

interface Conteo {
  nombre: string;
  total: number;
}
interface Promedio {
  nombre: string;
  promedioHoras: number;
  muestras: number;
}

/**
 * P1 §7 — Dashboard de monitoreo en tiempo real del administrador:
 * trámites por estado (+activos/cerrados), tiempo promedio de atención por
 * departamento y por política, y departamentos con mayor carga.
 * (Los cuellos de botella tienen su propia vista en /admin/metricas.)
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container-fluid py-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 class="h4 mb-0">Dashboard</h1>
          <p class="text-muted small mb-0">Monitoreo en tiempo real de la operación.</p>
        </div>
        <button class="btn btn-sm btn-outline-secondary" type="button" (click)="cargar()">
          Actualizar
        </button>
      </div>

      @if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      }

      @if (data(); as d) {
        <!-- Tarjetas de totales -->
        <div class="row g-3 mb-3">
          <div class="col-sm-4">
            <div class="card border-0 shadow-sm text-center">
              <div class="card-body">
                <div class="display-6 fw-semibold">{{ d.totalTramites }}</div>
                <div class="text-muted small">Trámites totales</div>
              </div>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="card border-0 shadow-sm text-center">
              <div class="card-body">
                <div class="display-6 fw-semibold text-primary">{{ d.activos }}</div>
                <div class="text-muted small">Activos</div>
              </div>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="card border-0 shadow-sm text-center">
              <div class="card-body">
                <div class="display-6 fw-semibold text-success">{{ d.cerrados }}</div>
                <div class="text-muted small">Cerrados</div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3">
          <!-- Trámites por estado -->
          <div class="col-lg-6">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-white fw-semibold">Trámites por estado</div>
              <div class="card-body">
                @for (b of barras(d.porEstado); track b.nombre) {
                  <div class="d-flex align-items-center mb-2">
                    <div class="text-truncate me-2" style="width: 32%;" [title]="b.nombre">{{ b.nombre }}</div>
                    <div class="flex-grow-1 bg-light rounded" style="height: 1.1rem;">
                      <div class="bg-primary rounded" [style.width.%]="b.pct" style="height: 100%;"></div>
                    </div>
                    <div class="ms-2 small fw-semibold" style="width: 2.5rem; text-align: right;">{{ b.total }}</div>
                  </div>
                } @empty {
                  <span class="text-muted small">Sin datos.</span>
                }
              </div>
            </div>
          </div>

          <!-- Carga por departamento -->
          <div class="col-lg-6">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-white fw-semibold">Carga actual por departamento</div>
              <div class="card-body">
                @for (b of barras(d.cargaPorDepartamento); track b.nombre) {
                  <div class="d-flex align-items-center mb-2">
                    <div class="text-truncate me-2" style="width: 32%;" [title]="b.nombre">{{ b.nombre }}</div>
                    <div class="flex-grow-1 bg-light rounded" style="height: 1.1rem;">
                      <div class="bg-warning rounded" [style.width.%]="b.pct" style="height: 100%;"></div>
                    </div>
                    <div class="ms-2 small fw-semibold" style="width: 2.5rem; text-align: right;">{{ b.total }}</div>
                  </div>
                } @empty {
                  <span class="text-muted small">Sin trámites activos.</span>
                }
              </div>
            </div>
          </div>

          <!-- Promedio por departamento -->
          <div class="col-lg-6">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-white fw-semibold">Tiempo promedio por departamento (h)</div>
              <div class="card-body">
                @for (p of d.promedioPorDepartamento; track p.nombre) {
                  <div class="d-flex justify-content-between border-bottom py-1 small">
                    <span class="text-truncate me-2">{{ p.nombre }}</span>
                    <span><strong>{{ p.promedioHoras }}</strong> h <span class="text-muted">({{ p.muestras }})</span></span>
                  </div>
                } @empty {
                  <span class="text-muted small">Aún no hay métricas de actividades completadas.</span>
                }
              </div>
            </div>
          </div>

          <!-- Promedio por política -->
          <div class="col-lg-6">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-white fw-semibold">Tiempo promedio por política (h)</div>
              <div class="card-body">
                @for (p of d.promedioPorPolitica; track p.nombre) {
                  <div class="d-flex justify-content-between border-bottom py-1 small">
                    <span class="text-truncate me-2">{{ p.nombre }}</span>
                    <span><strong>{{ p.promedioHoras }}</strong> h <span class="text-muted">({{ p.muestras }})</span></span>
                  </div>
                } @empty {
                  <span class="text-muted small">Aún no hay métricas de actividades completadas.</span>
                }
              </div>
            </div>
          </div>
        </div>
      } @else if (!error()) {
        <div class="text-center text-muted py-5">
          <span class="spinner-border spinner-border-sm me-2"></span>Cargando métricas…
        </div>
      }
    </section>
  `,
})
export class DashboardComponent {
  private readonly metricas = inject(MetricasService);

  readonly data = signal<any | null>(null);
  readonly error = signal('');

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.error.set('');
    this.metricas.getDashboard().subscribe({
      next: (d) => this.data.set(d),
      error: () => this.error.set('No se pudieron cargar las métricas del dashboard.'),
    });
  }

  /** Normaliza una lista {nombre,total} a barras con % relativo al máximo. */
  barras(lista: Conteo[] | undefined): (Conteo & { pct: number })[] {
    const l = lista ?? [];
    const max = Math.max(1, ...l.map((x) => x.total));
    return l.map((x) => ({ ...x, pct: Math.round((x.total / max) * 100) }));
  }
}
