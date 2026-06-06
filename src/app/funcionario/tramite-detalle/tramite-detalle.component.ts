import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { CompletarNodoRequest, TramiteDetalle } from '../../core/models/tramite.model';
import { mensajeAmigable } from '../../core/utils/error-messages';

@Component({
  selector: 'app-tramite-detalle',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './tramite-detalle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TramiteDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly workflowSvc = inject(WorkflowService);

  readonly tramiteId = this.route.snapshot.params['id'] as string;

  readonly tramite = signal<TramiteDetalle | null>(null);
  readonly loading = signal(false);
  readonly procesando = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  readonly form = this.fb.nonNullable.group({
    resultado: ['completado', [Validators.required]],
    observaciones: [''],
  });

  readonly finalizado = computed(() => {
    const estado = this.tramite()?.estado;
    return estado === 'Aprobado' || estado === 'Rechazado' || estado === 'Cancelado';
  });

  readonly puedeCompletar = computed(() => {
    const data = this.tramite();
    return !!data?.nodoActual && data.nodoActual.tipo === 'actividad' && !this.finalizado();
  });

  // Si el siguiente nodo es un 'decision' (if), el backend lo expone aquí con su
  // pregunta + ramas; el funcionario responde Sí/No y se envía como decision.
  readonly decisionSiguiente = computed(() => this.tramite()?.decisionSiguiente ?? null);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');

    this.workflowSvc.obtenerEstado(this.tramiteId).subscribe({
      next: (tramite) => {
        this.tramite.set(tramite);
        // Si el siguiente paso es un 'decision', preseleccionamos la primera rama
        // ('si') para que el control tenga un valor válido; si no, avance lineal.
        const rama = tramite?.decisionSiguiente?.opciones?.[0]?.valor;
        this.form.patchValue({ resultado: rama ?? 'completado' });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(mensajeAmigable(err));
        this.loading.set(false);
      },
    });
  }

  completarNodo(): void {
    if (this.form.invalid || !this.puedeCompletar() || this.procesando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.procesando.set(true);
    this.error.set('');

    const { resultado, observaciones } = this.form.getRawValue();
    // El backend deriva funcionarioId del JWT; el payload solo lleva decision/notas.
    // Si el siguiente nodo es un 'decision' (if), 'resultado' ya es la rama elegida
    // ('si'/'no'). Si no, 'completado' = avance lineal sin decision.
    const esDecision = !!this.decisionSiguiente();
    const payload: CompletarNodoRequest = {
      decision: esDecision ? resultado : resultado === 'completado' ? undefined : resultado,
      notas: observaciones || undefined,
    };
    this.workflowSvc.completarNodo(this.tramiteId, payload).subscribe({
      next: (tramiteActualizado) => {
        this.tramite.set(tramiteActualizado);
        this.exito.set('Nodo completado correctamente');
        this.form.reset({ resultado: 'completado', observaciones: '' });
        this.procesando.set(false);
        setTimeout(() => this.exito.set(''), 4000);
      },
      error: (err) => {
        this.error.set(mensajeAmigable(err));
        this.procesando.set(false);
      },
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      // Estados globales del trámite (nuevo modelo)
      'En curso': 'bg-primary',
      Observado: 'bg-warning text-dark',
      Aprobado: 'bg-success',
      Rechazado: 'bg-danger',
      Cancelado: 'bg-secondary',
      // Legacy
      pendiente: 'bg-secondary',
      en_progreso: 'bg-warning text-dark',
      'En proceso': 'bg-primary',
      completado: 'bg-success',
      activo: 'bg-primary',
      archivado: 'bg-secondary',
    };
    return clases[estado] ?? 'bg-secondary';
  }

  // CU-42 (ruta óptima IA) se removió de la vista del funcionario.
  // El caso de uso pertenece al flujo cliente (móvil → IniciarTramiteIaScreen).
}
