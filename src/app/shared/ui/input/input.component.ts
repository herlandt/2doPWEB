import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  LucideAngularModule,
  LucideIconData,
  CheckCircle2,
  AlertCircle,
} from 'lucide-angular';

let nextId = 0;

@Component({
  selector: 'app-input',
  imports: [LucideAngularModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url'>('text');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly success = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly leadingIcon = input<LucideIconData | null>(null);
  readonly id = input<string>(`cre-input-${++nextId}`);

  protected readonly value = signal<string>('');
  protected readonly touched = signal<boolean>(false);

  protected readonly successIcon: LucideIconData = CheckCircle2;
  protected readonly errorIcon: LucideIconData = AlertCircle;

  protected readonly state = computed<'invalid' | 'valid' | 'idle'>(() => {
    if (this.error()) return 'invalid';
    if (this.success() && this.touched() && this.value()) return 'valid';
    return 'idle';
  });

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: unknown): void {
    this.value.set(v == null ? '' : String(v));
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(): void {
    /* noop — disabled flow controlled by [disabled] input */
  }

  protected handleInput(ev: Event): void {
    const next = (ev.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  protected handleBlur(): void {
    this.touched.set(true);
    this.onTouched();
  }
}
