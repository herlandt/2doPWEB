import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActividadService } from '../../core/services/actividad.service';
import { DepartamentoService } from '../../core/services/departamento.service';
import { DocumentoService } from '../../core/services/documento.service';
import { TramiteC2Service } from '../../core/services/tramite-c2.service';
import { Actividad, ActividadRequest, RequisitoDocumento } from '../../core/models/actividad.model';
import { Departamento } from '../../core/models/departamento.model';
import { Documento } from '../../core/models/documento.model';
import { PermisoDocumentalModalComponent } from '../../shared/permiso-documental-modal/permiso-documental-modal.component';

interface FuncionarioOption {
  id: string;
  nombre: string;
  email: string;
  departamentosIds?: string[];
}

@Component({
  selector: 'app-actividades',
  imports: [ReactiveFormsModule, PermisoDocumentalModalComponent],
  templateUrl: './actividades.component.html',
  styleUrl: './actividades.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActividadesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly actividadSvc = inject(ActividadService);
  private readonly deptoSvc = inject(DepartamentoService);
  private readonly docSvc = inject(DocumentoService);
  private readonly funcSvc = inject(TramiteC2Service);

  readonly actividades = signal<Actividad[]>([]);
  readonly departamentos = signal<Departamento[]>([]);
  readonly funcionarios = signal<FuncionarioOption[]>([]);
  readonly documentos = signal<Documento[]>([]);
  readonly deptoSeleccionado = signal('');
  readonly modoEdicion = signal(false);
  readonly editandoId = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  /** CU-36 — actividad cuya configuración de permiso documental se está editando. */
  readonly actividadParaPermiso = signal<Actividad | null>(null);

  /**
   * Espejo reactivo del control `documentosRequeridos` para poder derivar
   * señales computadas (la tabla y el dropdown de disponibles).
   */
  readonly requisitosActuales = signal<RequisitoDocumento[]>([]);

  readonly funcionariosFiltrados = computed(() => {
    const deptoId = this.deptoSeleccionado();
    const lista = this.funcionarios();
    if (!deptoId) return lista;
    return lista.filter((f) => f.departamentosIds?.includes(deptoId));
  });

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    descripcion: ['', [Validators.required]],
    departamentoId: ['', [Validators.required]],
    funcionarioResponsableId: [''],
    slaHoras: [8, [Validators.required, Validators.min(1)]],
    documentoIds: [[] as string[]],
    documentosRequeridos: [[] as RequisitoDocumento[]],
    reutilizable: [true],
  });

  /** Documentos del catálogo que aún no se agregaron como requisito. */
  readonly documentosDisponibles = computed(() => {
    const requeridos = this.requisitosActuales();
    const agregados = new Set(requeridos.map((r) => r.documentoId));
    return this.documentos().filter((d) => !agregados.has(d.id));
  });

  /** Documento seleccionado en el dropdown "Agregar documento requerido". */
  readonly documentoAAgregar = signal('');

  constructor() {
    this.cargar();

    this.form.controls.departamentoId.valueChanges.subscribe((deptoId) => {
      this.deptoSeleccionado.set(deptoId ?? '');
      const funcId = this.form.controls.funcionarioResponsableId.value;
      if (funcId) {
        const f = this.funcionarios().find((u) => u.id === funcId);
        if (f && !f.departamentosIds?.includes(deptoId ?? '')) {
          this.form.controls.funcionarioResponsableId.setValue('');
        }
      }
    });
  }

  cargar(): void {
    this.actividadSvc.listar().subscribe({
      next: (actividades) => this.actividades.set(actividades),
      error: (err) => {
        console.error('Error al cargar actividades:', err);
        this.error.set('Error al cargar actividades');
      },
    });

    this.deptoSvc.listar().subscribe({
      next: (departamentos) => this.departamentos.set(departamentos),
      error: (err) => {
        console.error('Error al cargar departamentos:', err);
        this.error.set('Error al cargar departamentos');
      },
    });

    this.docSvc.listarActivos().subscribe({
      next: (documentos) => this.documentos.set(documentos),
      error: (err) => {
        console.error('Error al cargar documentos:', err);
        this.error.set('Error al cargar documentos');
      },
    });

    this.funcSvc.getUsuarios().subscribe({
      next: (lista) => this.funcionarios.set(lista as FuncionarioOption[]),
      error: (err) => {
        console.error('Error al cargar funcionarios:', err);
        this.funcionarios.set([]);
      },
    });
  }

  getNombreDepto(id: string): string {
    return this.departamentos().find((item) => item.id === id)?.codigo ?? id;
  }

  editar(actividad: Actividad): void {
    this.modoEdicion.set(true);
    this.editandoId.set(actividad.id);

    // Usar documentosRequeridos si existe; si no, derivarlo del legacy documentoIds.
    const requisitos: RequisitoDocumento[] =
      actividad.documentosRequeridos && actividad.documentosRequeridos.length > 0
        ? actividad.documentosRequeridos.map((r) => ({ ...r }))
        : (actividad.documentoIds ?? []).map((documentoId) => ({
            documentoId,
            proveedor: 'CLIENTE' as const,
            obligatorio: true,
          }));

    this.form.patchValue({
      nombre: actividad.nombre,
      descripcion: actividad.descripcion,
      departamentoId: actividad.departamentoId,
      funcionarioResponsableId: actividad.funcionarioResponsableId ?? '',
      slaHoras: actividad.slaHoras,
      documentoIds: actividad.documentoIds ?? [],
      documentosRequeridos: requisitos,
      reutilizable: actividad.reutilizable,
    });
    this.requisitosActuales.set(requisitos);
    this.documentoAAgregar.set('');
  }

  cancelar(): void {
    this.modoEdicion.set(false);
    this.editandoId.set('');
    this.form.reset({
      nombre: '',
      descripcion: '',
      departamentoId: '',
      funcionarioResponsableId: '',
      slaHoras: 8,
      documentoIds: [],
      documentosRequeridos: [],
      reutilizable: true,
    });
    this.requisitosActuales.set([]);
    this.documentoAAgregar.set('');
  }

  getNombreFuncionario(id?: string): string {
    if (!id) return '—';
    return this.funcionarios().find((f) => f.id === id)?.nombre ?? id;
  }

  getNombreDocumento(id: string): string {
    return this.documentos().find((d) => d.id === id)?.nombre ?? id;
  }

  /** Alias usado por la tabla de requisitos en la plantilla. */
  nombreDocumento(documentoId: string): string {
    return this.getNombreDocumento(documentoId);
  }

  // ── Requisitos documentales (proveedor + obligatorio por documento) ───────

  /** Reemplaza la lista de requisitos en el control y en el espejo reactivo. */
  private setRequisitos(requisitos: RequisitoDocumento[]): void {
    this.form.controls.documentosRequeridos.setValue(requisitos);
    this.requisitosActuales.set(requisitos);
  }

  agregarRequisito(documentoId: string): void {
    if (!documentoId) return;
    const actuales = this.requisitosActuales();
    if (actuales.some((r) => r.documentoId === documentoId)) return;
    this.setRequisitos([
      ...actuales,
      { documentoId, proveedor: 'CLIENTE', obligatorio: true },
    ]);
    this.documentoAAgregar.set('');
  }

  quitarRequisito(documentoId: string): void {
    this.setRequisitos(this.requisitosActuales().filter((r) => r.documentoId !== documentoId));
  }

  setProveedor(documentoId: string, valor: 'CLIENTE' | 'FUNCIONARIO'): void {
    this.setRequisitos(
      this.requisitosActuales().map((r) =>
        r.documentoId === documentoId ? { ...r, proveedor: valor } : r,
      ),
    );
  }

  setObligatorio(documentoId: string, valor: boolean): void {
    this.setRequisitos(
      this.requisitosActuales().map((r) =>
        r.documentoId === documentoId ? { ...r, obligatorio: valor } : r,
      ),
    );
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();
    const documentosRequeridos = raw.documentosRequeridos;
    // Las salidas reales se derivan de la posición del nodo en el flujo; la
    // actividad guarda un placeholder que el motor ignora.
    const payload: ActividadRequest = {
      ...raw,
      // Mantener documentoIds derivado de los requisitos por compatibilidad.
      documentoIds: documentosRequeridos.map((r) => r.documentoId),
      documentosRequeridos,
      salidasPosibles: ['completar'],
    };
    const request$ = this.modoEdicion()
      ? this.actividadSvc.actualizar(this.editandoId(), payload)
      : this.actividadSvc.crear(payload);

    request$.subscribe({
      next: () => {
        this.exito.set(`Actividad ${this.modoEdicion() ? 'actualizada' : 'creada'}`);
        this.cancelar();
        this.cargar();
        this.loading.set(false);
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err: { error?: { message?: string } }) => {
        this.error.set(err.error?.message ?? 'Error al guardar');
        this.loading.set(false);
      },
    });
  }

  eliminar(id: string): void {
    if (!confirm('Eliminar actividad?')) return;

    this.actividadSvc.eliminar(id).subscribe({
      next: () => {
        this.actividades.update((lista) => lista.filter((actividad) => actividad.id !== id));
      },
      error: () => this.error.set('Error al eliminar actividad'),
    });
  }

  // ── CU-36 · permisos documentales ───────────────────────────────────────
  abrirPermisos(actividad: Actividad): void {
    this.actividadParaPermiso.set(actividad);
  }

  cerrarPermisos(): void {
    this.actividadParaPermiso.set(null);
  }
}
