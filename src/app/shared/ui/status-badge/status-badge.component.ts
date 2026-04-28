import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="cre-badge" [class]="badgeClass()">
      @if (dot()) { <span class="dot" [class]="'dot-' + variant()"></span> }
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-success { background: var(--cre-success-500); }
    .dot-warning { background: var(--cre-warning-500); }
    .dot-danger  { background: var(--cre-danger-500); }
    .dot-info    { background: var(--cre-info-500); }
    .dot-brand   { background: var(--cre-brand-500); }
    .dot-neutral { background: var(--cre-text-subtle); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly variant = input<StatusVariant>('neutral');
  readonly dot = input<boolean>(false);

  protected readonly badgeClass = computed(() => {
    const v = this.variant();
    if (v === 'neutral') return '';
    return `cre-badge-${v}`;
  });
}
