import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiagramaService } from '../../core/services/diagrama.service';
import { PoliticaService } from '../../core/services/politica.service';
import { DiagramaWorkflow } from '../../core/models/diagrama.model';
import { Politica } from '../../core/models/politica.model';

@Component({
  selector: 'app-politicas-lista',
  imports: [RouterLink],
  templateUrl: './politicas-lista.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticasListaComponent {
  private readonly politicaSvc = inject(PoliticaService);
  private readonly diagramaSvc = inject(DiagramaService);

  readonly politicas = signal<Politica[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  readonly mostrarModalAsignar = signal(false);
  readonly politicaAsignando = signal<Politica | null>(null);
  readonly diagramasHuerfanos = signal<DiagramaWorkflow[]>([]);
  readonly diagramaSeleccionadoId = signal('');
  readonly cargandoHuerfanos = signal(false);
  readonly asignando = signal(false);

  constructor() {
    this.cargar();
  }

  private getApiErrorMessage(err: unknown, fallback: string): string {
    const apiError = err as {
      error?: {
        message?: string;
        error?: string;
        details?: string[];
      };
    };

    const detail = apiError.error?.details?.[0];
    return apiError.error?.message ?? apiError.error?.error ?? detail ?? fallback;
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');

    this.politicaSvc.listar().subscribe({
      next: (politicas) => {
        this.politicas.set(politicas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar politicas');
        this.loading.set(false);
      },
    });
  }

  cambiarEstado(politica: Politica, nuevoEstado: string): void {
    this.politicaSvc.cambiarEstado(politica.id, nuevoEstado).subscribe({
      next: (actualizada) => {
        this.politicas.update((lista) =>
          lista.map((item) => (item.id === actualizada.id ? actualizada : item)),
        );
        this.exito.set(`Politica "${actualizada.nombre}" -> ${actualizada.estado}`);
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err: unknown) => {
        this.error.set(this.getApiErrorMessage(err, 'Error al cambiar estado'));
      },
    });
  }

  eliminar(id: string, nombre: string): void {
    if (!confirm(`Eliminar politica "${nombre}"?`)) return;

    this.politicaSvc.eliminar(id).subscribe({
      next: () => {
        this.politicas.update((lista) => lista.filter((politica) => politica.id !== id));
        this.exito.set('Politica eliminada');
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err: unknown) => {
        this.error.set(this.getApiErrorMessage(err, 'Error al eliminar'));
      },
    });
  }

  getAccionesEstado(estadoActual: string): string[] {
    const estados = ['borrador', 'activa', 'archivada'];
    return estados.filter((estado) => estado !== estadoActual);
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      activa: 'bg-success',
      borrador: 'bg-warning text-dark',
      archivada: 'bg-secondary',
    };
    return clases[estado] ?? 'bg-secondary';
  }

  abrirModalAsignar(politica: Politica): void {
    this.politicaAsignando.set(politica);
    this.diagramaSeleccionadoId.set('');
    this.mostrarModalAsignar.set(true);
    this.cargandoHuerfanos.set(true);

    this.diagramaSvc.listarHuerfanos().subscribe({
      next: (diagramas) => {
        this.diagramasHuerfanos.set(diagramas);
        this.cargandoHuerfanos.set(false);
      },
      error: () => {
        this.cargandoHuerfanos.set(false);
        this.error.set('Error al cargar diagramas disponibles');
      },
    });
  }

  cerrarModalAsignar(): void {
    this.mostrarModalAsignar.set(false);
    this.politicaAsignando.set(null);
    this.diagramaSeleccionadoId.set('');
  }

  onDiagramaSeleccionado(ev: Event): void {
    this.diagramaSeleccionadoId.set((ev.target as HTMLSelectElement).value);
  }

  confirmarAsignacion(): void {
    const politica = this.politicaAsignando();
    const diagramaId = this.diagramaSeleccionadoId();
    if (!politica || !diagramaId) return;

    this.asignando.set(true);
    this.politicaSvc
      .actualizar(politica.id, {
        nombre: politica.nombre,
        descripcion: politica.descripcion,
        categoria: politica.categoria,
        estado: politica.estado,
        diagramaId,
      })
      .subscribe({
        next: (actualizada) => {
          this.politicas.update((lista) =>
            lista.map((p) => (p.id === actualizada.id ? actualizada : p)),
          );
          this.asignando.set(false);
          this.cerrarModalAsignar();
          this.exito.set(`Diagrama vinculado a "${actualizada.nombre}"`);
          setTimeout(() => this.exito.set(''), 3000);
        },
        error: (err: unknown) => {
          this.asignando.set(false);
          this.error.set(this.getApiErrorMessage(err, 'Error al asignar diagrama'));
        },
      });
  }
}
