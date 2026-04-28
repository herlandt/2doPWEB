import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MetricasService } from '../../core/services/metricas.service';

@Component({
  selector: 'app-dashboard-metricas',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './dashboard-metricas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardMetricasComponent {
  private readonly metricasSvc = inject(MetricasService);

  readonly cuellosDeBotella = signal<any[]>([]);
  readonly metricas = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  // Para buscar métricas de un trámite específico (CU-24)
  readonly tramiteIdBusqueda = signal('');

  constructor() {
    this.cargarCuellos();
  }

  cargarCuellos(): void {
    this.loading.set(true);
    this.error.set('');

    this.metricasSvc.getCuellosDeBotella().subscribe({
      next: (data) => {
        this.cuellosDeBotella.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los cuellos de botella.');
        this.loading.set(false);
      },
    });
  }

  buscarMetricasTramite(): void {
    const id = this.tramiteIdBusqueda().trim();
    if (!id) return;

    this.metricasSvc.getMetricasTramite(id).subscribe({
      next: (data) => this.metricas.set(data),
      error: () => this.error.set('No se encontraron métricas para ese trámite.'),
    });
  }

  setTramiteIdBusqueda(ev: Event): void {
    this.tramiteIdBusqueda.set((ev.target as HTMLInputElement).value);
  }

  formatearHoras(segundos: number): string {
    return (segundos / 3600).toFixed(1);
  }
}
