import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-autorizado',
  imports: [RouterLink],
  template: `
    <section class="container py-5 text-center">
      <h1 class="h3 mb-2">No autorizado</h1>
      <p class="text-body-secondary mb-4">No tienes permisos para acceder a este recurso.</p>
      <a routerLink="/login" class="btn btn-primary">Volver al login</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoAutorizadoComponent {}
