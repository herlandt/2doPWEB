import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `
    @if (title() || subtitle() || hasActions) {
      <header class="cre-card-head">
        <div class="cre-card-titles">
          @if (title()) { <h3 class="cre-card-title">{{ title() }}</h3> }
          @if (subtitle()) { <p class="cre-card-subtitle">{{ subtitle() }}</p> }
        </div>
        <div class="cre-card-actions">
          <ng-content select="[card-actions]"></ng-content>
        </div>
      </header>
    }
    <div class="cre-card-body" [class.flush]="flush()">
      <ng-content></ng-content>
    </div>
    <ng-content select="[card-footer]"></ng-content>
  `,
  styles: [`
    :host {
      display: block;
      background: var(--cre-surface);
      border: 1px solid var(--cre-border);
      border-radius: var(--cre-radius-lg);
      box-shadow: var(--cre-shadow-sm);
      transition: box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease;
      overflow: hidden;
    }
    :host(.hoverable):hover {
      box-shadow: var(--cre-shadow-md);
      transform: translateY(-1px);
      border-color: var(--cre-border-strong);
    }
    .cre-card-head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--cre-border);
    }
    .cre-card-titles { flex: 1; min-width: 0; }
    .cre-card-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--cre-text);
      letter-spacing: -0.01em;
    }
    .cre-card-subtitle {
      margin: 2px 0 0;
      font-size: 0.8125rem;
      color: var(--cre-text-muted);
    }
    .cre-card-actions { display: flex; align-items: center; gap: 0.5rem; }
    .cre-card-body { padding: 1.25rem; }
    .cre-card-body.flush { padding: 0; }
  `],
  host: { '[class.hoverable]': 'hoverable()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly flush = input<boolean>(false);
  readonly hoverable = input<boolean>(false);

  /** Best-effort flag: si el consumidor proyecta `[card-actions]` mostramos el slot. */
  protected get hasActions(): boolean {
    // Renderizamos siempre el wrapper de actions cuando haya título o subtítulo;
    // si no se proyecta nada, queda vacío sin coste visual.
    return !!(this.title() || this.subtitle());
  }
}
