import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MetricasService } from '../../core/services/metricas.service';
import { DepartamentoService } from '../../core/services/departamento.service';
import { ActividadService } from '../../core/services/actividad.service';
import { Departamento } from '../../core/models/departamento.model';
import { Actividad } from '../../core/models/actividad.model';
import { mensajeAmigable } from '../../core/utils/error-messages';

@Component({
  selector: 'app-dashboard-metricas',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './dashboard-metricas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardMetricasComponent {
  private readonly metricasSvc = inject(MetricasService);
  private readonly deptoSvc = inject(DepartamentoService);
  private readonly actividadSvc = inject(ActividadService);

  readonly cuellosDeBotella = signal<any[]>([]);
  readonly metricas = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly departamentos = signal<Map<string, string>>(new Map());
  readonly actividades = signal<Map<string, string>>(new Map());

  // Para buscar métricas de un trámite específico (CU-24)
  readonly tramiteIdBusqueda = signal('');

  constructor() {
    this.cargarCuellos();
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.deptoSvc.listar().subscribe({
      next: (deptos) => {
        const map = new Map(deptos.map(d => [d.id, d.nombre]));
        this.departamentos.set(map);
      },
    });

    this.actividadSvc.listar().subscribe({
      next: (acts) => {
        const map = new Map(acts.map(a => [a.id, a.nombre]));
        this.actividades.set(map);
      },
    });
  }

  cargarCuellos(): void {
    this.loading.set(true);
    this.error.set('');

    this.metricasSvc.getCuellosDeBotella().subscribe({
      next: (data) => {
        this.cuellosDeBotella.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(mensajeAmigable(err));
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

  getNombreDepartamento(id: string): string {
    return this.departamentos().get(id) || id;
  }

  getNombreActividad(id: string): string {
    return this.actividades().get(id) || id;
  }
}
