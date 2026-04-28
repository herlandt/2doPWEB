import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideAngularModule,
  LucideIconData,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-angular';
import { ToastService, ToastVariant } from './toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [LucideAngularModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  readonly svc = inject(ToastService);

  protected readonly icons: Record<ToastVariant, LucideIconData> = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
  };

  protected readonly closeIcon: LucideIconData = X;

  iconFor(variant: ToastVariant): LucideIconData {
    return this.icons[variant];
  }
}
