import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../core/services/usuario.service';
import { DepartamentoService } from '../../core/services/departamento.service';
import { Departamento } from '../../core/models/departamento.model';
import { UsuarioCreateRequest, UsuarioUpdateRequest } from '../../core/models/usuario.model';
import { mensajeAmigable } from '../../core/utils/error-messages';

@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './usuario-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioSvc = inject(UsuarioService);
  private readonly deptoSvc = inject(DepartamentoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly departamentos = signal<Departamento[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  // Solo los funcionarios pertenecen a un departamento (calle/swimlane). Para
  // administrador/cliente el campo Departamentos no aplica → se oculta.
  readonly esFuncionario = signal(true);

  readonly usuarioId = this.route.snapshot.params['id'] as string | undefined;
  readonly esEdicion = !!this.usuarioId;
  readonly tiposDisponibles = ['administrador', 'funcionario'];

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    tipo: ['funcionario', [Validators.required]],
    departamentosIds: [[] as string[]],
    activo: [true],
  });

  constructor() {
    // Mostrar/ocultar Departamentos según el tipo; al dejar de ser funcionario, limpiar.
    this.form.controls.tipo.valueChanges.subscribe((tipo) => {
      const esFunc = tipo === 'funcionario';
      this.esFuncionario.set(esFunc);
      if (!esFunc) {
        this.form.controls.departamentosIds.setValue([]);
      }
    });

    this.deptoSvc.listar().subscribe({
      next: (departamentos) => this.departamentos.set(departamentos),
      error: (err) => this.error.set(mensajeAmigable(err)),
    });

    if (this.esEdicion && this.usuarioId) {
      this.usuarioSvc.buscarPorId(this.usuarioId).subscribe({
        next: (usuario) => {
          this.form.patchValue({
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            tipo: usuario.tipo,
            departamentosIds: usuario.departamentosIds ?? [],
            activo: usuario.activo,
          });
          this.esFuncionario.set(usuario.tipo === 'funcionario');
          this.form.controls.password.clearValidators();
          this.form.controls.password.updateValueAndValidity();
        },
        error: (err) => this.error.set(mensajeAmigable(err)),
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    // Solo el funcionario lleva departamentos; para admin/cliente se manda vacío.
    const departamentosIds = this.esFuncionario() ? value.departamentosIds : [];
    if (this.esFuncionario() && departamentosIds.length === 0) {
      this.error.set('Un funcionario debe pertenecer a al menos un departamento.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    if (this.esEdicion && this.usuarioId) {
      const payload: UsuarioUpdateRequest = {
        nombre: value.nombre,
        apellido: value.apellido,
        tipo: value.tipo,
        departamentosIds,
        activo: value.activo,
      };

      this.usuarioSvc.actualizar(this.usuarioId, payload).subscribe({
        next: () => this.router.navigateByUrl('/admin/usuarios'),
        error: (err: unknown) => {
          this.error.set(mensajeAmigable(err));
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
      departamentosIds,
    };

    this.usuarioSvc.crear(payload).subscribe({
      next: () => this.router.navigateByUrl('/admin/usuarios'),
      error: (err: unknown) => {
        this.error.set(mensajeAmigable(err));
        this.loading.set(false);
      },
    });
  }
}
