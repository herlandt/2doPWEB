import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** Credenciales reales del seed (UsuarioSeeder.java). Las usa el panel demo. */
  readonly cuentasDemo = [
    { label: 'Administrador', email: 'admin@cre.bo',       password: 'admin12345',   variant: 'primary' },
    { label: 'Func. TEC',     email: 'funcionario@cre.bo', password: 'func12345',    variant: 'success' },
    { label: 'Func. ATC',     email: 'func_atc@cre.bo',    password: 'func12345',    variant: 'success' },
    { label: 'Func. LEG',     email: 'func_leg@cre.bo',    password: 'func12345',    variant: 'success' },
    { label: 'Func. OPE',     email: 'func_ope@cre.bo',    password: 'func12345',    variant: 'success' },
    { label: 'Cliente',       email: 'cliente@cre.bo',     password: 'cliente12345', variant: 'info' },
  ];

  /** Autollena el formulario con las credenciales seleccionadas. */
  llenarDemo(c: { email: string; password: string }): void {
    this.form.patchValue({ email: c.email, password: c.password });
    this.error.set('');
  }

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.redirigirSegunRol();
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.redirigirSegunRol();
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string } }) => {
        this.error.set(err.error?.message ?? 'Credenciales incorrectas');
        this.loading.set(false);
      },
    });
  }

  private redirigirSegunRol(): void {
    if (this.auth.isAdmin()) {
      this.router.navigateByUrl('/admin/dashboard');
      return;
    }

    if (this.auth.isFuncionario()) {
      this.router.navigateByUrl('/funcionario/bandeja');
      return;
    }

    this.router.navigateByUrl('/login');
  }
}
