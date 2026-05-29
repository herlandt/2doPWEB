import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NivelRiesgo } from '../../core/models/tramite-riesgo.model';

/**
 * CU-43 — Badge visual del nivel de riesgo de un trámite.
 *
 * Uso:
 *   <app-chip-riesgo [nivel]="t.riesgoDemora" [probSla]="t.probSuperarSla" />
 */
@Component({
  selector: 'app-chip-riesgo',
  imports: [DecimalPipe],
  template: `
    <span class="badge rounded-pill {{ clase() }}" [title]="tooltip()">
      <span class="dot me-1">●</span>
      {{ label() }}
      @if (mostrarProb() && probSla() != null) {
        <span class="ms-1 opacity-75">{{ (probSla()! * 100) | number: '1.0-0' }}%</span>
      }
    </span>
  `,
  styles: [
    `
      .badge { font-weight: 500; padding: 0.35em 0.7em; font-size: 0.75rem; }
      .dot { font-size: 0.6rem; line-height: 1; }
      .bg-riesgo-alto         { background-color: #dc3545; color: #fff; }
      .bg-riesgo-medio        { background-color: #f59e0b; color: #1f2937; }
      .bg-riesgo-bajo         { background-color: #10b981; color: #fff; }
      .bg-riesgo-desconocido  { background-color: #6b7280; color: #fff; }
    `,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipRiesgoComponent {
  /** Nivel de riesgo del trámite. Si viene null o '', se trata como desconocido. */
  readonly nivel = input<NivelRiesgo | string | null | undefined>(null);
  /** Probabilidad SLA en [0, 1]. Opcional, se muestra entre paréntesis. */
  readonly probSla = input<number | null | undefined>(null);
  /** Si false, no muestra el porcentaje aunque venga `probSla`. */
  readonly mostrarProb = input<boolean>(true);

  protected readonly nivelNorm = computed<NivelRiesgo>(() => {
    const n = (this.nivel() ?? '').toString().toLowerCase();
    if (n === 'alto' || n === 'medio' || n === 'bajo') return n as NivelRiesgo;
    return 'desconocido';
  });

  protected readonly clase = computed(() => `bg-riesgo-${this.nivelNorm()}`);

  protected readonly label = computed(() => {
    const n = this.nivelNorm();
    return n.charAt(0).toUpperCase() + n.slice(1);
  });

  protected readonly tooltip = computed(() => {
    const p = this.probSla();
    if (p == null) return `Nivel de riesgo: ${this.nivelNorm()}`;
    return `Probabilidad estimada de superar el SLA: ${(p * 100).toFixed(0)}%`;
  });
}
