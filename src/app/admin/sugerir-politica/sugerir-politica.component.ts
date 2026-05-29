import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CandidatoPolitica,
  SugerirPoliticaResponse,
} from '../../core/models/sugerencia-politica.model';
import { IaService } from '../../core/services/ia.service';

/**
 * CU-40 — Sugerencia automática de política a partir de descripción libre.
 *
 * En el flujo real esto vive en la app móvil del cliente. La pantalla web
 * sirve como demo para que el admin pruebe el flujo (y para clientes que
 * accedan vía navegador).
 *
 * Flujo:
 *   1. Usuario escribe descripción libre.
 *   2. POST → backend → microservicio IA → devuelve top 3.
 *   3. Usuario confirma la sugerida o elige otra (registra feedback).
 */
@Component({
  selector: 'app-sugerir-politica',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './sugerir-politica.component.html',
  styleUrl: './sugerir-politica.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SugerirPoliticaComponent {
  private readonly iaSvc = inject(IaService);

  readonly descripcion = signal('');
  readonly sugerencia = signal<SugerirPoliticaResponse | null>(null);
  readonly seleccionada = signal<string>('');
  readonly procesando = signal(false);
  readonly confirmando = signal(false);
  readonly feedbackFinal = signal<string>('');   // ACEPTADA | CAMBIADA | CANCELADA
  readonly error = signal('');

  readonly ejemplos = [
    'Necesito una nueva conexión eléctrica para mi casa nueva en la zona residencial.',
    'Quiero ampliar el medidor porque agregué un horno eléctrico y aire acondicionado.',
    'Soy nuevo dueño de la casa y necesito que el servicio cambie a mi nombre.',
    'Mi servicio fue cortado por falta de pago y ya pagué la deuda.',
  ];

  readonly puedeConfirmar = computed(() => !!this.sugerencia() && !!this.seleccionada());
  readonly esCambioDeOpcion = computed(() => {
    const s = this.sugerencia();
    return !!s && this.seleccionada() !== s.politicaSugeridaId;
  });

  sugerir(): void {
    const desc = this.descripcion().trim();
    if (!desc || this.procesando()) return;
    this.procesando.set(true);
    this.error.set('');
    this.sugerencia.set(null);
    this.feedbackFinal.set('');

    this.iaSvc.sugerirPolitica({ descripcion: desc }).subscribe({
      next: (resp) => {
        this.sugerencia.set(resp);
        this.seleccionada.set(resp.politicaSugeridaId);
        this.procesando.set(false);
      },
      error: (err: any) => {
        this.procesando.set(false);
        if (err?.status === 503) {
          this.error.set(
            'El microservicio IA no está disponible. Intenta más tarde o elige tu política manualmente.',
          );
        } else if (err?.status === 409) {
          this.error.set('No hay políticas activas. Habla con el administrador.');
        } else {
          this.error.set(err?.error?.message ?? 'No se pudo procesar tu descripción.');
        }
      },
    });
  }

  elegir(c: CandidatoPolitica): void {
    this.seleccionada.set(c.politicaId);
  }

  confirmar(): void {
    const s = this.sugerencia();
    if (!s || !this.seleccionada() || this.confirmando()) return;
    this.confirmando.set(true);
    this.iaSvc
      .confirmarSugerencia(s.sugerenciaId, { politicaConfirmadaId: this.seleccionada() })
      .subscribe({
        next: () => {
          this.confirmando.set(false);
          this.feedbackFinal.set(this.esCambioDeOpcion() ? 'CAMBIADA' : 'ACEPTADA');
        },
        error: (err: any) => {
          this.confirmando.set(false);
          this.error.set(err?.error?.message ?? 'No se pudo confirmar la sugerencia.');
        },
      });
  }

  cancelar(): void {
    const s = this.sugerencia();
    if (!s || this.confirmando()) return;
    this.confirmando.set(true);
    this.iaSvc.cancelarSugerencia(s.sugerenciaId).subscribe({
      next: () => {
        this.confirmando.set(false);
        this.feedbackFinal.set('CANCELADA');
      },
      error: () => {
        this.confirmando.set(false);
        this.feedbackFinal.set('CANCELADA');
      },
    });
  }

  reset(): void {
    this.descripcion.set('');
    this.sugerencia.set(null);
    this.seleccionada.set('');
    this.feedbackFinal.set('');
    this.error.set('');
  }

  usarEjemplo(ej: string): void {
    this.descripcion.set(ej);
  }

  badgeConfianza(c: number): string {
    if (c >= 0.7) return 'bg-success';
    if (c >= 0.4) return 'bg-warning text-dark';
    return 'bg-secondary';
  }
}
