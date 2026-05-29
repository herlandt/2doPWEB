import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, OperatorFunction } from 'rxjs';
import { ChipRiesgoComponent } from '../../shared/chip-riesgo/chip-riesgo.component';
import { PrediccionService } from '../../core/services/prediccion.service';
import { TramiteC2Service } from '../../core/services/tramite-c2.service';
import { NivelRiesgo, TramiteRiesgo } from '../../core/models/tramite-riesgo.model';

type Orden = 'fecha' | 'ia';

interface TramiteEnBandeja {
  id: string;
  codigo?: string;
  estado?: string;
  estadoActual?: string;
  politicaNombre?: string;
  fechaInicio?: string;
  prioridad?: number;
  /** CU-43 — datos de riesgo enriquecidos en cliente */
  riesgoDemora?: NivelRiesgo | string;
  probSuperarSla?: number | null;
  razonesRiesgo?: string[];
}

/** Helper rxjs: cualquier error → lista vacía (para no tumbar el forkJoin). */
function catchToEmpty<T>(): OperatorFunction<T[], T[]> {
  return catchError(() => of([] as T[]));
}

@Component({
  selector: 'app-bandeja-entrada',
  imports: [ChipRiesgoComponent],
  templateUrl: './bandeja-entrada.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaEntradaComponent {
  private readonly tramiteSvc = inject(TramiteC2Service);
  private readonly prediccionSvc = inject(PrediccionService);
  private readonly router = inject(Router);

  readonly tramites = signal<TramiteEnBandeja[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  /** CU-44 — orden 'fecha' (default) o 'ia' (delegado al microservicio). */
  readonly orden = signal<Orden>('fecha');
  /** CU-43 — true si /tramites/en-riesgo respondió con datos. */
  readonly riesgoDisponible = signal(false);
  readonly avisoIa = signal('');

  readonly contadorAltos = computed(
    () =>
      this.tramites().filter(
        (t) => (t.riesgoDemora ?? '').toString().toLowerCase() === 'alto',
      ).length,
  );

  constructor() {
    this.cargar();
  }

  /** Carga bandeja + riesgo en paralelo. Si la IA cae, bandeja sigue sin chips. */
  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.avisoIa.set('');

    const orden = this.orden();

    forkJoin({
      bandeja: this.tramiteSvc.getMisPendientes(orden).pipe(catchToEmpty()),
      riesgo: this.prediccionSvc.enRiesgo().pipe(catchToEmpty()),
    }).subscribe({
      next: ({ bandeja, riesgo }) => {
        const mapaRiesgo = new Map<string, TramiteRiesgo>();
        for (const r of riesgo) mapaRiesgo.set(r.tramiteId, r);
        this.riesgoDisponible.set(riesgo.length > 0);

        const enriquecidos: TramiteEnBandeja[] = (bandeja ?? []).map((t: any) => {
          const r = mapaRiesgo.get(t.id);
          return {
            ...t,
            riesgoDemora: r?.nivel ?? t.riesgoDemora ?? 'desconocido',
            probSuperarSla: r?.probSuperarSla ?? t.probSuperarSla ?? null,
            razonesRiesgo: r?.razones ?? [],
          };
        });

        this.tramites.set(enriquecidos);
        this.loading.set(false);

        if (orden === 'ia' && !this.riesgoDisponible()) {
          this.avisoIa.set(
            'El asistente IA no está disponible — el backend devolvió el orden de fallback.',
          );
        }
      },
      error: () => {
        this.error.set('Error al cargar la bandeja de entrada.');
        this.loading.set(false);
      },
    });
  }

  cambiarOrden(nuevo: Orden): void {
    if (nuevo === this.orden()) return;
    this.orden.set(nuevo);
    this.cargar();
  }

  verExpediente(tramiteId: string): void {
    this.router.navigate(['/funcionario/expediente', tramiteId]);
  }

  formatearFecha(iso?: string): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  tooltipRiesgo(t: TramiteEnBandeja): string {
    if (!t.razonesRiesgo || !t.razonesRiesgo.length) return '';
    return t.razonesRiesgo.join(' · ');
  }
}
