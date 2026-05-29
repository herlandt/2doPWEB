import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { CompletarNodoRequest, TramiteDetalle } from '../../core/models/tramite.model';

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

  readonly puedeCompletar = computed(() => {
    const data = this.tramite();
    return !!data?.nodoActual && data.nodoActual.tipo === 'actividad' && data.estado !== 'completado';
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');

    this.workflowSvc.obtenerEstado(this.tramiteId).subscribe({
      next: (tramite) => {
        this.tramite.set(tramite);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el tramite');
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

    const payload: CompletarNodoRequest = this.form.getRawValue();
    this.workflowSvc.completarNodo(this.tramiteId, payload).subscribe({
      next: (tramiteActualizado) => {
        this.tramite.set(tramiteActualizado);
        this.exito.set('Nodo completado correctamente');
        this.form.reset({ resultado: 'completado', observaciones: '' });
        this.procesando.set(false);
        setTimeout(() => this.exito.set(''), 4000);
      },
      error: (err: { error?: { message?: string } }) => {
        this.error.set(err.error?.message ?? 'Error al completar el nodo');
        this.procesando.set(false);
      },
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      pendiente: 'bg-secondary',
      en_progreso: 'bg-warning text-dark',
      completado: 'bg-success',
      activo: 'bg-primary',
      archivado: 'bg-secondary',
    };
    return clases[estado] ?? 'bg-secondary';
  }

  // CU-42 (ruta óptima IA) se removió de la vista del funcionario.
  // El caso de uso pertenece al flujo cliente (móvil → IniciarTramiteIaScreen).
}
