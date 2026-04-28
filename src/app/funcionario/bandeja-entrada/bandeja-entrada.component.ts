import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TramiteC2Service } from '../../core/services/tramite-c2.service';

@Component({
  selector: 'app-bandeja-entrada',
  imports: [],
  templateUrl: './bandeja-entrada.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaEntradaComponent {
  private readonly tramiteC2Svc = inject(TramiteC2Service);
  private readonly router = inject(Router);

  readonly tramites = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');

    this.tramiteC2Svc.getMisPendientes().subscribe({
      next: (data) => {
        this.tramites.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar la bandeja de entrada.');
        this.loading.set(false);
      },
    });
  }

  verExpediente(tramiteId: string): void {
    this.router.navigate(['/funcionario/expediente', tramiteId]);
  }

  formatearFecha(iso: string): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return iso;
    }
  }
}
