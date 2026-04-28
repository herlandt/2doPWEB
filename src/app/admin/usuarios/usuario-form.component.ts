import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../core/services/usuario.service';
import { RolService } from '../../core/services/rol.service';
import { DepartamentoService } from '../../core/services/departamento.service';
import { Rol } from '../../core/models/rol.model';
import { Departamento } from '../../core/models/departamento.model';
import { UsuarioCreateRequest, UsuarioUpdateRequest } from '../../core/models/usuario.model';

@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './usuario-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioSvc = inject(UsuarioService);
  private readonly rolSvc = inject(RolService);
  private readonly deptoSvc = inject(DepartamentoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly roles = signal<Rol[]>([]);
  readonly departamentos = signal<Departamento[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly usuarioId = this.route.snapshot.params['id'] as string | undefined;
  readonly esEdicion = !!this.usuarioId;
  readonly tiposDisponibles = ['administrador', 'funcionario'];

  private getApiErrorMessage(err: unknown, fallback: string): string {
    const apiError = err as {
      error?: {
        message?: string;
        error?: string;
        details?: string[];
      };
    };

    const detail = apiError.error?.details?.[0];
    return apiError.error?.message ?? apiError.error?.error ?? detail ?? fallback;
  }

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    tipo: ['funcionario', [Validators.required]],
    rolId: [''],
    departamentosIds: [[] as string[]],
    activo: [true],
  });

  constructor() {
    this.rolSvc.listar().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.error.set('Error al cargar roles'),
    });

    this.deptoSvc.listar().subscribe({
      next: (departamentos) => this.departamentos.set(departamentos),
      error: () => this.error.set('Error al cargar departamentos'),
    });

    if (this.esEdicion && this.usuarioId) {
      this.usuarioSvc.buscarPorId(this.usuarioId).subscribe({
        next: (usuario) => {
          this.form.patchValue({
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            tipo: usuario.tipo,
            rolId: usuario.rolId,
            departamentosIds: usuario.departamentosIds ?? [],
            activo: usuario.activo,
          });
          this.form.controls.password.clearValidators();
          this.form.controls.password.updateValueAndValidity();
        },
        error: () => this.error.set('Error al cargar usuario'),
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const value = this.form.getRawValue();

    if (this.esEdicion && this.usuarioId) {
      const payload: UsuarioUpdateRequest = {
        nombre: value.nombre,
        apellido: value.apellido,
        tipo: value.tipo,
        rolId: value.rolId,
        departamentosIds: value.departamentosIds,
        activo: value.activo,
      };

      this.usuarioSvc.actualizar(this.usuarioId, payload).subscribe({
        next: () => this.router.navigateByUrl('/admin/usuarios'),
        error: (err: unknown) => {
          this.error.set(this.getApiErrorMessage(err, 'Error al guardar usuario'));
          this.loading.set(false);
        },
      });
      return;
    }

    const payload: UsuarioCreateRequest = {
      nombre: value.nombre,
      apellido: value.apellido,
      email: value.email,
      password: value.password,
      tipo: value.tipo,
      departamentosIds: value.departamentosIds,
    };

    this.usuarioSvc.crear(payload).subscribe({
      next: () => this.router.navigateByUrl('/admin/usuarios'),
      error: (err: unknown) => {
        this.error.set(this.getApiErrorMessage(err, 'Error al guardar usuario'));
        this.loading.set(false);
      },
    });
  }
}
