import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DocumentoService } from '../../core/services/documento.service';
import { Documento } from '../../core/models/documento.model';

@Component({
  selector: 'app-documentos',
  imports: [ReactiveFormsModule],
  templateUrl: './documentos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly docSvc = inject(DocumentoService);

  readonly documentos = signal<Documento[]>([]);
  readonly modoEdicion = signal(false);
  readonly editandoId = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: ['', [Validators.required]],
    activo: [true],
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.docSvc.listar().subscribe({
      next: (documentos) => this.documentos.set(documentos),
      error: () => this.error.set('Error al cargar documentos'),
    });
  }

  editar(doc: Documento): void {
    this.modoEdicion.set(true);
    this.editandoId.set(doc.id);
    this.form.patchValue({
      nombre: doc.nombre,
      descripcion: doc.descripcion,
      activo: doc.activo,
    });
  }

  cancelar(): void {
    this.modoEdicion.set(false);
    this.editandoId.set('');
    this.form.reset({
      nombre: '',
      descripcion: '',
      activo: true,
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const payload = this.form.getRawValue();
    const request$ = this.modoEdicion()
      ? this.docSvc.actualizar(this.editandoId(), payload as any)
      : this.docSvc.crear(payload as any);

    request$.subscribe({
      next: () => {
        this.exito.set(`Documento ${this.modoEdicion() ? 'actualizado' : 'creado'}`);
        this.cancelar();
        this.cargar();
        this.loading.set(false);
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err: any) => {
        this.error.set(err.error?.message ?? 'Error al guardar');
        this.loading.set(false);
      },
    });
  }

  eliminar(id: string): void {
    if (!confirm('Eliminar documento?')) return;

    this.docSvc.eliminar(id).subscribe({
      next: () => {
        this.documentos.update((lista) => lista.filter((doc) => doc.id !== id));
      },
      error: () => this.error.set('Error al eliminar documento'),
    });
  }
}
