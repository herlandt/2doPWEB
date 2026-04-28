import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiagramaService } from '../../core/services/diagrama.service';
import { PoliticaService } from '../../core/services/politica.service';
import { DiagramaWorkflow } from '../../core/models/diagrama.model';
import { Politica } from '../../core/models/politica.model';

@Component({
  selector: 'app-diagramas-lista',
  imports: [RouterLink],
  templateUrl: './diagramas-lista.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagramasListaComponent {
  private readonly diagramaSvc = inject(DiagramaService);
  private readonly politicaSvc = inject(PoliticaService);

  readonly diagramas = signal<DiagramaWorkflow[]>([]);
  readonly politicas = signal<Politica[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  constructor() {
    this.cargar();
    this.politicaSvc.listar().subscribe({
      next: (politicas) => this.politicas.set(politicas),
      error: () => this.error.set('Error al cargar politicas'),
    });
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');

    this.diagramaSvc.listarDiagramas().subscribe({
      next: (diagramas) => {
        this.diagramas.set(diagramas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar diagramas');
        this.loading.set(false);
      },
    });
  }

  getNombrePolitica(politicaId?: string): string {
    if (!politicaId) return 'Sin politica';
    return this.politicas().find((politica) => politica.id === politicaId)?.nombre ?? politicaId;
  }

  eliminar(id: string, nombre: string): void {
    if (!confirm(`Eliminar diagrama "${nombre}"?`)) return;

    this.diagramaSvc.eliminarDiagrama(id).subscribe({
      next: () => {
        this.diagramas.update((lista) => lista.filter((item) => item.id !== id));
        this.exito.set('Diagrama eliminado');
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err: { error?: { message?: string } }) => {
        this.error.set(err.error?.message ?? 'Error al eliminar');
      },
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      borrador: 'bg-warning text-dark',
      publicado: 'bg-success',
      archivado: 'bg-secondary',
    };
    return clases[estado] ?? 'bg-secondary';
  }
}
