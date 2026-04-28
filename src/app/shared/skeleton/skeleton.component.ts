import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    <span
      class="cre-skeleton"
      [style.width]="width()"
      [style.height]="height()"
      [style.borderRadius]="rounded() ? '999px' : 'var(--cre-radius-md)'"
      aria-hidden="true"
    ></span>
  `,
  styles: [`
    :host { display: inline-block; line-height: 0; }
    .cre-skeleton {
      display: inline-block;
      background: linear-gradient(
        90deg,
        var(--cre-bg-muted) 0%,
        var(--cre-surface-2) 50%,
        var(--cre-bg-muted) 100%
      );
      background-size: 800px 100%;
      animation: cre-shimmer 1.4s linear infinite;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly rounded = input<boolean>(false);
}
