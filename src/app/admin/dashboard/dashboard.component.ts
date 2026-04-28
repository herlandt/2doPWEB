import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <section class="container py-4">
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <h1 class="h4 mb-2">Dashboard Admin</h1>
          <p class="text-body-secondary mb-0">
            Inicio administrativo habilitado. En G2/G3/G5 puedes agregar modulos de usuarios,
            departamentos, politicas y diagramas.
          </p>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {}
