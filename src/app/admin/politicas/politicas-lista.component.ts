import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PoliticaService } from '../../core/services/politica.service';
import { Politica } from '../../core/models/politica.model';

@Component({
  selector: 'app-politicas-lista',
  imports: [RouterLink],
  templateUrl: './politicas-lista.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticasListaComponent {
  private readonly politicaSvc = inject(PoliticaService);

  readonly politicas = signal<Politica[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

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
}
