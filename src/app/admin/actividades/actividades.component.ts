import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActividadService } from '../../core/services/actividad.service';
import { DepartamentoService } from '../../core/services/departamento.service';
import { DocumentoService } from '../../core/services/documento.service';
import { TramiteC2Service } from '../../core/services/tramite-c2.service';
import {
  Actividad,
  ActividadRequest,
  SALIDAS_INFO,
  SalidaActividad,
  SalidaInfo,
} from '../../core/models/actividad.model';
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

  readonly salidasInfo: readonly SalidaInfo[] = SALIDAS_INFO;
  readonly salidasSeleccionadas = signal<SalidaActividad[]>(['completar']);

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
    reutilizable: [true],
  });

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
    this.salidasSeleccionadas.set(
      actividad.salidasPosibles?.length ? [...actividad.salidasPosibles] : ['completar'],
    );
    this.form.patchValue({
      nombre: actividad.nombre,
      descripcion: actividad.descripcion,
      departamentoId: actividad.departamentoId,
      funcionarioResponsableId: actividad.funcionarioResponsableId ?? '',
      slaHoras: actividad.slaHoras,
      documentoIds: actividad.documentoIds ?? [],
      reutilizable: actividad.reutilizable,
    });
  }

  cancelar(): void {
    this.modoEdicion.set(false);
    this.editandoId.set('');
    this.salidasSeleccionadas.set(['completar']);
    this.form.reset({
      nombre: '',
      descripcion: '',
      departamentoId: '',
      funcionarioResponsableId: '',
      slaHoras: 8,
      documentoIds: [],
      reutilizable: true,
    });
  }

  getNombreFuncionario(id?: string): string {
    if (!id) return '—';
    return this.funcionarios().find((f) => f.id === id)?.nombre ?? id;
  }

  getNombreDocumento(id: string): string {
    return this.documentos().find((d) => d.id === id)?.nombre ?? id;
  }

  toggleDocumento(docId: string): void {
    const current = this.form.controls.documentoIds.value;
    const updated = current.includes(docId)
      ? current.filter((id) => id !== docId)
      : [...current, docId];
    this.form.controls.documentoIds.setValue(updated);
  }

  isDocumentoSeleccionado(docId: string): boolean {
    return this.form.controls.documentoIds.value.includes(docId);
  }

  isSalidaSeleccionada(s: SalidaActividad): boolean {
    return this.salidasSeleccionadas().includes(s);
  }

  toggleSalida(s: SalidaActividad): void {
    this.salidasSeleccionadas.update((curr) =>
      curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s],
    );
  }

  getSalidaInfo(value: string): SalidaInfo | undefined {
    return this.salidasInfo.find((s) => s.value === value);
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const salidas = this.salidasSeleccionadas();
    if (salidas.length === 0) {
      this.error.set('Selecciona al menos una salida posible');
      return;
    }

    // Toda actividad debe poder AVANZAR el trámite; si solo se marca observar/
    // rechazar, el funcionario quedaría sin botón para continuar (trámite atascado).
    if (!salidas.some((s) => s === 'aprobar' || s === 'completar' || s === 'derivar')) {
      this.error.set('La actividad necesita al menos una salida que avance el trámite (Aprobar o Completar).');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();
    const payload: ActividadRequest = {
      ...raw,
      salidasPosibles: salidas,
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
