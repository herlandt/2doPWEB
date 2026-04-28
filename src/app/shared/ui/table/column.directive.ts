import { Directive, inject, input, TemplateRef } from '@angular/core';

/**
 * Renderizado custom de una columna por clave.
 *
 * Uso:
 *   <app-table [columns]="cols" [data]="rows()">
 *     <ng-template appColumn="rolId" let-row>
 *       <app-status-badge variant="brand">{{ row.rolId }}</app-status-badge>
 *     </ng-template>
 *   </app-table>
 */
@Directive({
  selector: '[appColumn]',
  standalone: true,
})
export class ColumnTemplateDirective {
  readonly key = input.required<string>({ alias: 'appColumn' });
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}
