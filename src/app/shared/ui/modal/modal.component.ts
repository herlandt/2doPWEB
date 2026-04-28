import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostListener,
  inject,
  input,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LucideAngularModule, LucideIconData, X } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  imports: [LucideAngularModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly closeOnBackdrop = input<boolean>(true);
  readonly closeOnEsc = input<boolean>(true);
  readonly closed = output<void>();

  protected readonly closeIcon: LucideIconData = X;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;
      const wasOpen = this.open();
      document.body.style.overflow = wasOpen ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open() && this.closeOnEsc()) this.closed.emit();
  }

  protected onBackdrop(): void {
    if (this.closeOnBackdrop()) this.closed.emit();
  }

  protected close(): void {
    this.closed.emit();
  }
}
