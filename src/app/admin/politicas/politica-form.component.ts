import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PoliticaService } from '../../core/services/politica.service';
import { DiagramaService } from '../../core/services/diagrama.service';
import { PoliticaRequest } from '../../core/models/politica.model';
import { DiagramaWorkflow } from '../../core/models/diagrama.model';

@Component({
  selector: 'app-politica-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './politica-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly politicaSvc = inject(PoliticaService);
  private readonly diagramaSvc = inject(DiagramaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly estadoOriginal = signal('borrador');

  readonly politicaId = this.route.snapshot.params['id'] as string | undefined;
  readonly esEdicion = !!this.politicaId;

  readonly categorias = ['conexiones', 'reconexiones', 'mantenimiento', 'reclamos', 'otros'];

  readonly diagramasHuerfanos = signal<DiagramaWorkflow[]>([]);
  readonly diagramaActual = signal<DiagramaWorkflow | null>(null);

  readonly diagramasDisponibles = computed<DiagramaWorkflow[]>(() => {
    const actual = this.diagramaActual();
    const huerfanos = this.diagramasHuerfanos();
    if (!actual) return huerfanos;
    const yaIncluido = huerfanos.some((d) => d.id === actual.id);
    return yaIncluido ? huerfanos : [actual, ...huerfanos];
  });

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

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: ['', [Validators.required]],
    categoria: ['conexiones', [Validators.required]],
    estado: ['borrador', [Validators.required]],
    diagramaId: [''],
  });

  constructor() {
    this.diagramaSvc.listarHuerfanos().subscribe({
      next: (lista) => this.diagramasHuerfanos.set(lista),
      error: () => this.diagramasHuerfanos.set([]),
    });

    if (this.esEdicion && this.politicaId) {
      this.politicaSvc.buscarPorId(this.politicaId).subscribe({
        next: (politica) => {
          this.estadoOriginal.set(politica.estado);
          this.form.patchValue({
            nombre: politica.nombre,
            descripcion: politica.descripcion,
            categoria: politica.categoria,
            estado: politica.estado,
            diagramaId: politica.diagramaId ?? '',
          });

          if (politica.diagramaId) {
            this.diagramaSvc.obtenerDiagrama(politica.diagramaId).subscribe({
              next: (d) => this.diagramaActual.set(d),
              error: () => this.diagramaActual.set(null),
            });
          }
        },
        error: () => this.error.set('Error al cargar politica'),
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();
    const payload: PoliticaRequest = {
      ...raw,
      diagramaId: raw.diagramaId || undefined,
    };

    if (this.esEdicion && this.politicaId) {
      const estadoObjetivo = payload.estado;
      const payloadActualizacion: PoliticaRequest = {
        ...payload,
        estado: this.estadoOriginal(),
      };

      this.politicaSvc.actualizar(this.politicaId, payloadActualizacion).subscribe({
        next: () => {
          if (estadoObjetivo !== this.estadoOriginal()) {
            this.politicaSvc.cambiarEstado(this.politicaId!, estadoObjetivo).subscribe({
              next: () => this.router.navigateByUrl('/admin/politicas'),
              error: (err: unknown) => {
                this.error.set(this.getApiErrorMessage(err, 'Error al cambiar estado'));
                this.loading.set(false);
              },
            });
            return;
          }

          this.router.navigateByUrl('/admin/politicas');
        },
        error: (err: unknown) => {
          this.error.set(this.getApiErrorMessage(err, 'Error al guardar'));
          this.loading.set(false);
        },
      });
      return;
    }

    this.politicaSvc.crear(payload).subscribe({
      next: () => this.router.navigateByUrl('/admin/politicas'),
      error: (err: unknown) => {
        this.error.set(this.getApiErrorMessage(err, 'Error al guardar'));
        this.loading.set(false);
      },
    });
  }
}
