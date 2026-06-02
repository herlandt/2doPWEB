import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { TramiteResumen } from '../../core/models/tramite.model';

@Component({
  selector: 'app-tramites-lista',
  imports: [RouterLink],
  templateUrl: './tramites-lista.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TramitesListaComponent {
  private readonly workflowSvc = inject(WorkflowService);

  readonly tramites = signal<TramiteResumen[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filtroEstado = signal('');

  readonly estados = ['En curso', 'Observado', 'Aprobado', 'Rechazado', 'Cancelado'];

  readonly tramitesFiltrados = computed(() => {
    const estado = this.filtroEstado();
    const data = this.tramites();
    if (!estado) return data;
    return data.filter((tramite) => tramite.estado === estado);
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');

    this.workflowSvc.listarTramites().subscribe({
      next: (tramites) => {
        this.tramites.set(tramites);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar tramites');
        this.loading.set(false);
      },
    });
  }

  setFiltroEstado(estado: string): void {
    this.filtroEstado.set(estado);
  }

  getPrioridadLabel(prioridad: number): string {
    const labels: Record<number, string> = {
      1: 'Baja',
      2: 'Normal',
      3: 'Alta',
      4: 'Urgente',
      5: 'Critica',
    };
    return labels[prioridad] ?? `P${prioridad}`;
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      // Estados globales del trámite (nuevo modelo)
      'En curso': 'bg-primary',
      Observado: 'bg-warning text-dark',
      Aprobado: 'bg-success',
      Rechazado: 'bg-danger',
      Cancelado: 'bg-secondary',
      // Legacy (compatibilidad con datos antiguos)
      activo: 'bg-primary',
      en_progreso: 'bg-warning text-dark',
      'En proceso': 'bg-primary',
      completado: 'bg-success',
      archivado: 'bg-secondary',
    };
    return clases[estado] ?? 'bg-secondary';
  }

  getFiltroButtonClass(estado: string): string {
    return this.filtroEstado() === estado ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-secondary';
  }
}
