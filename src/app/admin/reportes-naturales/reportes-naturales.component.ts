import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReporteNaturalResponse } from '../../core/models/reporte-natural.model';
import { ReporteNaturalService } from '../../core/services/reporte-natural.service';
import { TranscripcionService } from '../../core/services/transcripcion.service';
import { GrabadorVozComponent } from '../../shared/grabador-voz/grabador-voz.component';
import { mensajeAmigable } from '../../core/utils/error-messages';

/**
 * CU-41 — Reportes ad-hoc por consulta natural.
 *
 * El admin escribe una consulta libre ("conteo de tramites por estado",
 * "tramites entre el 1 y 15 de mayo") y el sistema:
 *   1. delega al microservicio IA para interpretar y generar un pipeline Mongo,
 *   2. backend valida y ejecuta el pipeline contra la colección permitida,
 *   3. devuelve `filasMuestra` (50 filas) + `totalFilas`.
 */
@Component({
  selector: 'app-reportes-naturales',
  imports: [FormsModule, GrabadorVozComponent],
  templateUrl: './reportes-naturales.component.html',
  styleUrl: './reportes-naturales.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesNaturalesComponent {
  private readonly svc = inject(ReporteNaturalService);
  private readonly transcripcionSvc = inject(TranscripcionService);
  private readonly grabador = viewChild(GrabadorVozComponent);

  readonly consulta = signal('');
  readonly resultado = signal<ReporteNaturalResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly transcribiendo = signal(false);

  readonly ejemplos = [
    'conteo de tramites por estado',
    'tramites entre el 1 y el 15 de mayo',
    'cuantos tramites hay agrupados',
    'listar todos los tramites recientes',
  ];

  readonly columnas = computed<string[]>(() => {
    const r = this.resultado();
    if (!r || !r.filasMuestra.length) return [];
    return Object.keys(r.filasMuestra[0]);
  });

  /** Es un reporte de CONTEO/agrupación (2 columnas y una es 'total') → graficable. */
  readonly esConteo = computed<boolean>(() => {
    const cols = this.columnas();
    return cols.length === 2 && cols.includes('total');
  });

  /** Datos del gráfico de barras (etiqueta, valor, % relativo al máximo). */
  readonly chart = computed<{ label: string; value: number; pct: number }[]>(() => {
    const r = this.resultado();
    if (!r || !this.esConteo()) return [];
    const labelCol = this.columnas().find((c) => c !== 'total')!;
    const rows = r.filasMuestra.map((f) => ({
      label: this.formatear((f as any)[labelCol]),
      value: Number((f as any)['total']) || 0,
    }));
    const max = Math.max(1, ...rows.map((x) => x.value));
    return rows.map((x) => ({ ...x, pct: Math.round((x.value / max) * 100) }));
  });

  ejecutar(): void {
    const consulta = this.consulta().trim();
    if (!consulta || this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    this.resultado.set(null);

    this.svc.generar({ consulta, formatoExport: 'JSON' }).subscribe({
      next: (resp) => {
        this.resultado.set(resp);
        this.loading.set(false);
      },
      error: (err: any) => {
        const code = err?.status ?? 0;
        const msg = err?.error?.message ?? err?.error?.error ?? '';
        if (code === 503) {
          this.error.set(
            'El microservicio IA no está disponible. La consulta natural requiere IA.',
          );
        } else if (msg.includes('RPT_COLECCION_NO_PERMITIDA')) {
          this.error.set('La IA generó una consulta sobre una colección no permitida.');
        } else if (msg.includes('RPT_PIPELINE_INVALIDO')) {
          this.error.set('La IA generó un pipeline inválido (operadores prohibidos).');
        } else {
          this.error.set(mensajeAmigable(err));
        }
        this.loading.set(false);
      },
    });
  }

  usarEjemplo(ej: string): void {
    this.consulta.set(ej);
  }

  /** Voz → texto: el admin dicta la consulta y se coloca en el campo para revisarla. */
  onAudioReporte(audio: Blob): void {
    this.transcribiendo.set(true);
    this.error.set('');
    this.transcripcionSvc.transcribir(audio).subscribe({
      next: (resp) => {
        const texto = (resp.textoTranscrito ?? '').trim();
        if (texto) {
          this.consulta.set(texto);
        } else {
          this.error.set('No se entendió el audio. Intenta de nuevo o escribe la consulta.');
        }
        this.transcribiendo.set(false);
        this.grabador()?.liberar();
      },
      error: (err: any) => {
        this.error.set(
          err?.status === 503
            ? 'El microservicio IA no está disponible para transcribir la voz.'
            : mensajeAmigable(err),
        );
        this.transcribiendo.set(false);
        this.grabador()?.liberar();
      },
    });
  }

  limpiar(): void {
    this.consulta.set('');
    this.resultado.set(null);
    this.error.set('');
  }

  /** Renderizado seguro para celdas con objetos/arrays. */
  formatear(valor: unknown): string {
    if (valor == null) return '—';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }

  /** Descarga el reporte como Excel o PDF (lo genera el backend reusando POI/iText). */
  exportarArchivo(formato: 'xlsx' | 'pdf'): void {
    const consulta = this.consulta().trim();
    if (!consulta) return;
    this.svc.exportar(consulta, formato).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte.${formato}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: any) => this.error.set(mensajeAmigable(err)),
    });
  }

  exportarCsv(): void {
    const r = this.resultado();
    if (!r || !r.filasMuestra.length) return;
    const cols = this.columnas();
    const escape = (v: unknown) => {
      const s = this.formatear(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lineas = [cols.join(',')];
    for (const f of r.filasMuestra) {
      lineas.push(cols.map((c) => escape((f as any)[c])).join(','));
    }
    const csv = lineas.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${r.reporteId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
