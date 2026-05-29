import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AlertaAnomalia } from '../../core/models/alerta-anomalia.model';
import { AlertaAnomaliaService } from '../../core/services/alerta-anomalia.service';

/**
 * CU-45 — Panel administrador para revisar las anomalías detectadas por IA.
 *
 * Funciones:
 *  - listar anomalías abiertas
 *  - disparar detección manual (además del scheduler diario del backend)
 *  - marcar una como falso positivo (se quita del listado y entra al dataset de feedback)
 */
@Component({
  selector: 'app-anomalias',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './anomalias.component.html',
  styleUrl: './anomalias.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnomaliasComponent {
  private readonly svc = inject(AlertaAnomaliaService);

  readonly anomalias = signal<AlertaAnomalia[]>([]);
  readonly loading = signal(false);
  readonly detectando = signal(false);
  readonly procesandoId = signal<string | null>(null);
  readonly error = signal('');
  readonly exito = signal('');

  /** Filtro por categoría (multi-select simple por chip). */
  readonly filtroCategoria = signal<string | null>(null);

  readonly categoriasDisponibles = computed(() => {
    const set = new Set(this.anomalias().map((a) => a.categoria || 'sin_categoria'));
    return Array.from(set).sort();
  });

  readonly anomaliasVisibles = computed(() => {
    const f = this.filtroCategoria();
    if (!f) return this.anomalias();
    return this.anomalias().filter((a) => a.categoria === f);
  });

  readonly conteoPorCategoria = computed(() => {
    const m: Record<string, number> = {};
    for (const a of this.anomalias()) {
      const c = a.categoria || 'sin_categoria';
      m[c] = (m[c] ?? 0) + 1;
    }
    return m;
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.svc.listarAbiertas().subscribe({
      next: (lista) => {
        this.anomalias.set(lista);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de anomalías.');
        this.loading.set(false);
      },
    });
  }

  detectar(): void {
    if (this.detectando()) return;
    this.detectando.set(true);
    this.error.set('');
    this.svc.detectar().subscribe({
      next: (nuevas) => {
        this.detectando.set(false);
        this.exito.set(
          nuevas.length === 0
            ? 'Detección completada: no se encontraron anomalías nuevas.'
            : `Detección completada: ${nuevas.length} anomalías nuevas.`,
        );
        setTimeout(() => this.exito.set(''), 4000);
        this.cargar();
      },
      error: (err: any) => {
        this.detectando.set(false);
        const code = err?.status ?? 0;
        if (code === 503) {
          this.error.set(
            'El microservicio IA no está disponible. Intenta más tarde o espera al scheduler diario.',
          );
        } else {
          this.error.set('Error al disparar la detección.');
        }
      },
    });
  }

  marcarFalsoPositivo(a: AlertaAnomalia): void {
    if (this.procesandoId() === a.id) return;
    this.procesandoId.set(a.id);
    this.svc.marcarFalsoPositivo(a.id).subscribe({
      next: () => {
        // Quitar del listado local
        this.anomalias.update((lista) => lista.filter((x) => x.id !== a.id));
        this.procesandoId.set(null);
        this.exito.set('Marcada como falso positivo.');
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: () => {
        this.procesandoId.set(null);
        this.error.set('No se pudo marcar como falso positivo.');
      },
    });
  }

  cambiarFiltro(cat: string | null): void {
    this.filtroCategoria.set(cat);
  }

  /** Color del badge según categoría. */
  badgeCategoria(cat: string): string {
    switch ((cat || '').toLowerCase()) {
      case 'tiempo_atipico':       return 'bg-warning text-dark';
      case 'secuencia_inusual':    return 'bg-info text-dark';
      case 'loop_derivaciones':    return 'bg-danger';
      case 'salto_no_autorizado':  return 'bg-dark';
      default:                     return 'bg-secondary';
    }
  }

  /** Texto del título según score: 0..1 → "baja", "media", "alta". */
  intensidad(score: number): string {
    if (score >= 0.8) return 'alta';
    if (score >= 0.5) return 'media';
    return 'baja';
  }
}
