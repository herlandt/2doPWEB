import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DiagramaService } from '../../core/services/diagrama.service';
import { PoliticaService } from '../../core/services/politica.service';
import { Politica } from '../../core/models/politica.model';
import { PromptFlowResponse } from '../../core/models/diagrama.model';

@Component({
  selector: 'app-diagrama-ia',
  imports: [RouterLink, FormsModule],
  templateUrl: './diagrama-ia.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagramaIaComponent {
  private readonly diagramaSvc = inject(DiagramaService);
  private readonly politicaSvc = inject(PoliticaService);
  private readonly router = inject(Router);

  readonly politicas = signal<Politica[]>([]);
  readonly nombreDiagrama = signal('');
  readonly prompt = signal('');
  readonly politicaId = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly resultado = signal<PromptFlowResponse | null>(null);

  readonly promptEjemplo =
    'Flujo de solicitud de reconexion electrica: el cliente solicita en ATC, TEC hace inspeccion tecnica en paralelo con revision de deuda, LEG aprueba el acuerdo de pago, OPE ejecuta la reconexion.';

  constructor() {
    this.politicaSvc.listar().subscribe({
      next: (politicas) => this.politicas.set(politicas),
      error: () => this.error.set('Error al cargar politicas'),
    });
  }

  generar(): void {
    if (!this.prompt().trim() || !this.nombreDiagrama().trim() || this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    this.resultado.set(null);

    this.diagramaSvc
      .generarConIA({
        nombreDiagrama: this.nombreDiagrama().trim(),
        prompt: this.prompt(),
        politicaId: this.politicaId() || undefined,
      })
      .subscribe({
        next: (resultado) => {
          this.resultado.set(resultado);
          this.loading.set(false);
        },
        error: (err: { error?: { error?: string; details?: string[] } }) => {
          const detalle = err.error?.details?.join(', ');
          this.error.set(detalle ?? err.error?.error ?? 'Error al generar');
          this.loading.set(false);
        },
      });
  }

  usarEjemplo(): void {
    this.prompt.set(this.promptEjemplo);
  }

  verDiagrama(): void {
    const id = this.resultado()?.diagrama?.id;
    if (!id) return;
    this.router.navigate(['/admin/diagramas', id]);
  }
}
