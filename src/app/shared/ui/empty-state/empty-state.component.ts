import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule, LucideIconData, Inbox } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  imports: [LucideAngularModule],
  template: `
    <div class="empty">
      <div class="art" aria-hidden="true">
        <svg viewBox="0 0 200 140" class="art-svg">
          <defs>
            <linearGradient id="cre-empty-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--cre-brand-100)" />
              <stop offset="100%" stop-color="var(--cre-energy-50)" />
            </linearGradient>
          </defs>
          <ellipse cx="100" cy="120" rx="78" ry="8" fill="var(--cre-bg-muted)" />
          <rect x="44" y="38" width="112" height="74" rx="10" fill="url(#cre-empty-grad)" stroke="var(--cre-border)" />
          <rect x="58" y="56" width="84" height="6" rx="3" fill="var(--cre-border-strong)" opacity="0.7" />
          <rect x="58" y="70" width="56" height="6" rx="3" fill="var(--cre-border-strong)" opacity="0.5" />
          <rect x="58" y="84" width="70" height="6" rx="3" fill="var(--cre-border-strong)" opacity="0.4" />
        </svg>
        <span class="icon-overlay">
          <lucide-icon [img]="iconData()" [size]="22"></lucide-icon>
        </span>
      </div>

      <h3 class="title">{{ title() }}</h3>
      @if (description()) { <p class="description">{{ description() }}</p> }
      <div class="actions">
        <ng-content select="[empty-actions]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
      padding: 2.5rem 1.5rem;
    }
    .art {
      position: relative;
      width: 200px;
      height: 140px;
      margin-bottom: 0.5rem;
    }
    .art-svg { width: 100%; height: 100%; }
    .icon-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--cre-surface);
      box-shadow: var(--cre-shadow-md);
      color: var(--cre-brand-600);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--cre-text);
      letter-spacing: -0.01em;
    }
    .description {
      margin: 0;
      max-width: 360px;
      color: var(--cre-text-muted);
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .actions { margin-top: 0.75rem; display: flex; gap: 0.5rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly icon = input<LucideIconData | null>(null);

  protected iconData(): LucideIconData {
    return this.icon() ?? (Inbox as LucideIconData);
  }
}
