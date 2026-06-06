import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartamentoService } from '../../core/services/departamento.service';
import { Departamento, DepartamentoRequest } from '../../core/models/departamento.model';
import { mensajeAmigable } from '../../core/utils/error-messages';

@Component({
  selector: 'app-departamentos',
  imports: [ReactiveFormsModule],
  templateUrl: './departamentos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly deptoSvc = inject(DepartamentoService);

  readonly departamentos = signal<Departamento[]>([]);
  readonly modoEdicion = signal(false);
  readonly editandoId = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(5)]],
    nombre: ['', [Validators.required]],
    descripcion: ['', [Validators.required]],
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.deptoSvc.listar().subscribe({
      next: (departamentos) => this.departamentos.set(departamentos),
      error: (err) => this.error.set(mensajeAmigable(err)),
    });
  }

  editar(departamento: Departamento): void {
    this.modoEdicion.set(true);
    this.editandoId.set(departamento.id);
    this.form.patchValue({
      codigo: departamento.codigo,
      nombre: departamento.nombre,
      descripcion: departamento.descripcion,
    });
  }

  cancelar(): void {
    this.modoEdicion.set(false);
    this.editandoId.set('');
    this.form.reset();
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const value = this.form.getRawValue();
    const payload: DepartamentoRequest = {
      codigo: value.codigo.toUpperCase(),
      nombre: value.nombre,
      descripcion: value.descripcion,
    };

    const request$ = this.modoEdicion()
      ? this.deptoSvc.actualizar(this.editandoId(), payload)
      : this.deptoSvc.crear(payload);

    request$.subscribe({
      next: () => {
        this.exito.set(`Departamento ${this.modoEdicion() ? 'actualizado' : 'creado'}`);
        this.cancelar();
        this.cargar();
        this.loading.set(false);
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err: unknown) => {
        this.error.set(mensajeAmigable(err));
        this.loading.set(false);
      },
    });
  }

  eliminar(id: string): void {
    if (!confirm('Eliminar departamento?')) return;

    this.deptoSvc.eliminar(id).subscribe({
      next: () => {
        this.departamentos.update((lista) => lista.filter((item) => item.id !== id));
        this.exito.set('Departamento eliminado');
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err) => this.error.set(mensajeAmigable(err)),
    });
  }
}
