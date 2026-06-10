import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  CampoPlantilla,
  CampoPlantillaRequest,
  FormularioPlantilla,
  FormularioPlantillaRequest,
  TIPOS_CAMPO,
  TipoCampo,
} from '../../core/models/formulario.model';
import { FormularioService } from '../../core/services/formulario.service';

interface TipoCampoVisual {
  value: TipoCampo;
  label: string;
  icono: string;
  descripcion: string;
  necesitaOpciones: boolean;
  /** Etiqueta sugerida al soltar el campo en el canvas */
  etiquetaDefault: string;
}

const TIPOS_VISUAL: TipoCampoVisual[] = [
  { value: 'texto',    label: 'Texto corto',       icono: 'Aa', descripcion: 'Una línea (nombre, dirección…)', necesitaOpciones: false, etiquetaDefault: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo',       icono: '¶',  descripcion: 'Varias líneas (comentarios)',     necesitaOpciones: false, etiquetaDefault: 'Texto largo' },
  { value: 'numero',   label: 'Número',            icono: '#',  descripcion: 'Solo dígitos (edad, monto)',      necesitaOpciones: false, etiquetaDefault: 'Número' },
  { value: 'fecha',    label: 'Fecha',             icono: '📅', descripcion: 'Selector de calendario',          necesitaOpciones: false, etiquetaDefault: 'Fecha' },
  { value: 'select',   label: 'Lista desplegable', icono: '▾',  descripcion: 'Elegir una opción de una lista',  necesitaOpciones: true,  etiquetaDefault: 'Lista' },
  { value: 'radio',    label: 'Opción única',      icono: '◉',  descripcion: 'Botones de opción (radio)',       necesitaOpciones: true,  etiquetaDefault: 'Elija una opción' },
  { value: 'checkbox', label: 'Casilla (sí/no)',   icono: '☑',  descripcion: 'Una casilla marcable',            necesitaOpciones: false, etiquetaDefault: 'Acepto' },
  { value: 'archivo',  label: 'Adjuntar archivo',  icono: '📎', descripcion: 'Subir un documento o imagen',     necesitaOpciones: false, etiquetaDefault: 'Adjuntar archivo' },
  { value: 'calculado', label: 'Calculado',        icono: 'ƒ',  descripcion: 'Derivado de otros campos (fórmula)', necesitaOpciones: false, etiquetaDefault: 'Campo calculado' },
];

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 50);
}

@Component({
  selector: 'app-formulario-disenador',
  templateUrl: './formulario-disenador.component.html',
  styleUrl: './formulario-disenador.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioDisenadorComponent {
  private readonly formSvc = inject(FormularioService);

  readonly nodoId = input.required<string>();
  readonly nodoNombre = input<string>('');
  readonly readonly = input<boolean>(false);

  readonly cerrado = output<void>();

  readonly tiposCampo = TIPOS_CAMPO;
  readonly tiposVisual = TIPOS_VISUAL;

  readonly formulario = signal<FormularioPlantilla | null>(null);
  readonly campos = signal<CampoPlantilla[]>([]);
  readonly cargando = signal(false);
  readonly guardandoForm = signal(false);
  readonly guardandoCampo = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  // Cabecera
  readonly nombre = signal('');
  readonly permiteAdjuntos = signal(false);
  readonly permiteDictadoVoz = signal(false);

  // Selección + edición en panel lateral
  readonly campoSeleccionadoId = signal<string | null>(null);
  readonly opcionesTexto = signal('');

  // Drag state — desde la paleta o reordenando
  readonly dragTipoNuevo = signal<TipoCampo | null>(null);
  readonly dragIdReorden = signal<string | null>(null);
  readonly indicadorIndice = signal<number | null>(null);
  readonly hoveringCanvas = signal(false);

  readonly campoSeleccionado = computed(() => {
    const id = this.campoSeleccionadoId();
    if (!id) return null;
    return this.campos().find((c) => c.id === id) ?? null;
  });

  readonly necesitaOpciones = computed(() => {
    const c = this.campoSeleccionado();
    if (!c) return false;
    return this.tiposVisual.find((t) => t.value === c.tipo)?.necesitaOpciones ?? false;
  });

  readonly opcionesPreview = computed(() => {
    return this.opcionesTexto()
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  // ── Carga inicial ─────────────────────────────────────────
  private cargar(): void {
    const nodoId = this.nodoId();
    if (!nodoId) return;

    this.cargando.set(true);
    this.formSvc.obtenerPorNodo(nodoId).subscribe({
      next: (form) => {
        this.formulario.set(form);
        this.nombre.set(form.nombre);
        this.permiteAdjuntos.set(form.permiteAdjuntos);
        this.permiteDictadoVoz.set(form.permiteDictadoVoz);
        this.cargarCampos(form.id);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        if (err.status === 404) {
          this.formulario.set(null);
          this.campos.set([]);
          this.nombre.set(this.nodoNombre() ? `Formulario · ${this.nodoNombre()}` : '');
        } else {
          this.error.set(this.extractError(err, 'No se pudo cargar el formulario'));
        }
      },
    });
  }

  private cargarCampos(formularioId: string): void {
    this.formSvc.listarCampos(formularioId).subscribe({
      next: (lista) => {
        this.campos.set([...lista].sort((a, b) => a.orden - b.orden));
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(this.extractError(err, 'No se pudieron cargar los campos'));
      },
    });
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  // ── Cabecera ──────────────────────────────────────────────
  guardarCabecera(): void {
    if (this.readonly()) return;
    const nombre = this.nombre().trim();
    if (!nombre) {
      this.error.set('El nombre del formulario es obligatorio');
      return;
    }

    const payload: FormularioPlantillaRequest = {
      nombre,
      permiteAdjuntos: this.permiteAdjuntos(),
      permiteDictadoVoz: this.permiteDictadoVoz(),
    };

    this.guardandoForm.set(true);
    const form = this.formulario();
    const obs = form
      ? this.formSvc.actualizar(form.id, payload)
      : this.formSvc.crearParaNodo(this.nodoId(), payload);

    obs.subscribe({
      next: (guardado) => {
        this.formulario.set(guardado);
        this.guardandoForm.set(false);
        this.showSuccess(form ? 'Formulario actualizado' : 'Formulario creado — arrastra componentes desde la paleta');
        if (!form) this.cargarCampos(guardado.id);
      },
      error: (err) => {
        this.guardandoForm.set(false);
        this.error.set(this.extractError(err, 'Error al guardar formulario'));
      },
    });
  }

  eliminarFormulario(): void {
    const form = this.formulario();
    if (!form) return;
    if (!confirm('¿Eliminar el formulario completo del nodo? Se borrarán todos sus campos.')) return;

    this.formSvc.eliminar(form.id).subscribe({
      next: () => {
        this.formulario.set(null);
        this.campos.set([]);
        this.campoSeleccionadoId.set(null);
        this.showSuccess('Formulario eliminado');
      },
      error: (err) => this.error.set(this.extractError(err, 'Error al eliminar formulario')),
    });
  }

  // ── Drag desde la PALETA ───────────────────────────────────
  onPaletaDragStart(ev: DragEvent, tipo: TipoCampo): void {
    if (this.readonly() || !this.formulario()) {
      ev.preventDefault();
      return;
    }
    this.dragTipoNuevo.set(tipo);
    this.dragIdReorden.set(null);
    ev.dataTransfer?.setData('text/plain', `nuevo:${tipo}`);
    ev.dataTransfer!.effectAllowed = 'copy';
  }

  // ── Drag para REORDENAR en el canvas ──────────────────────
  onCampoDragStart(ev: DragEvent, campoId: string): void {
    if (this.readonly()) {
      ev.preventDefault();
      return;
    }
    this.dragIdReorden.set(campoId);
    this.dragTipoNuevo.set(null);
    ev.dataTransfer?.setData('text/plain', `reorden:${campoId}`);
    ev.dataTransfer!.effectAllowed = 'move';
  }

  // ── Canvas: hover + drop ──────────────────────────────────
  onCanvasDragOver(ev: DragEvent): void {
    if (!this.dragTipoNuevo() && !this.dragIdReorden()) return;
    ev.preventDefault();
    ev.dataTransfer!.dropEffect = this.dragTipoNuevo() ? 'copy' : 'move';
    this.hoveringCanvas.set(true);
  }

  onCampoSlotDragOver(ev: DragEvent, index: number): void {
    if (!this.dragTipoNuevo() && !this.dragIdReorden()) return;
    ev.preventDefault();
    ev.stopPropagation();
    // Insertamos antes (top half) o después (bottom half)
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = ev.clientY - rect.top;
    const insertAfter = offset > rect.height / 2;
    this.indicadorIndice.set(insertAfter ? index + 1 : index);
    this.hoveringCanvas.set(true);
  }

  onCanvasDragLeave(): void {
    this.hoveringCanvas.set(false);
    this.indicadorIndice.set(null);
  }

  onCanvasDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.hoveringCanvas.set(false);
    const indicador = this.indicadorIndice();
    this.indicadorIndice.set(null);

    const tipoNuevo = this.dragTipoNuevo();
    const idReorden = this.dragIdReorden();
    this.dragTipoNuevo.set(null);
    this.dragIdReorden.set(null);

    const form = this.formulario();
    if (!form) return;

    if (tipoNuevo) {
      const destino = indicador ?? this.campos().length;
      this.crearCampoEn(form.id, tipoNuevo, destino);
      return;
    }
    if (idReorden) {
      const destino = indicador ?? this.campos().length;
      this.reordenarCampoA(idReorden, destino);
    }
  }

  // ── Crear / reordenar / actualizar / eliminar ─────────────
  private crearCampoEn(formId: string, tipo: TipoCampo, posicion: number): void {
    const meta = this.tiposVisual.find((t) => t.value === tipo)!;
    const etiquetaBase = meta.etiquetaDefault;
    const ordenTemp = posicion + 1;
    // Generamos nombre único: slug + sufijo si colisiona
    let nombreTec = slugify(etiquetaBase);
    const existentes = new Set(this.campos().map((c) => c.nombre));
    if (existentes.has(nombreTec)) {
      let i = 2;
      while (existentes.has(`${nombreTec}_${i}`)) i++;
      nombreTec = `${nombreTec}_${i}`;
    }

    const payload: CampoPlantillaRequest = {
      nombre: nombreTec,
      etiqueta: etiquetaBase,
      tipo,
      obligatorio: false,
      opciones: meta.necesitaOpciones ? ['Opción 1', 'Opción 2'] : undefined,
      validacionRegex: undefined,
      // El backend exige fórmula en los calculados; '0' como placeholder editable.
      formula: tipo === 'calculado' ? '0' : undefined,
      orden: ordenTemp,
    };

    this.guardandoCampo.set(true);
    this.formSvc.agregarCampo(formId, payload).subscribe({
      next: (creado) => {
        this.guardandoCampo.set(false);
        // Insertar en la posición elegida
        const actuales = [...this.campos()];
        actuales.splice(posicion, 0, creado);
        this.campos.set(actuales);
        // Si la posición no era el final, persistimos el orden real
        if (posicion < actuales.length - 1) {
          this.persistirOrden(formId, actuales);
        } else {
          this.campos.set([...actuales].sort((a, b) => a.orden - b.orden));
        }
        this.campoSeleccionadoId.set(creado.id);
        this.opcionesTexto.set(creado.opciones?.join('\n') ?? '');
        this.showSuccess(`${meta.label} agregado`);
      },
      error: (err) => {
        this.guardandoCampo.set(false);
        this.error.set(this.extractError(err, 'Error al crear campo'));
      },
    });
  }

  private reordenarCampoA(campoId: string, posicion: number): void {
    const lista = [...this.campos()];
    const fromIndex = lista.findIndex((c) => c.id === campoId);
    if (fromIndex < 0) return;
    let to = posicion;
    if (fromIndex < to) to -= 1; // ajuste al quitar el origen
    if (fromIndex === to) return;

    const [movido] = lista.splice(fromIndex, 1);
    lista.splice(to, 0, movido);
    this.campos.set(lista);

    const form = this.formulario();
    if (form) this.persistirOrden(form.id, lista);
  }

  private persistirOrden(formId: string, lista: CampoPlantilla[]): void {
    const ids = lista.map((c) => c.id);
    this.formSvc.reordenarCampos(formId, ids).subscribe({
      next: (campos) => this.campos.set([...campos].sort((a, b) => a.orden - b.orden)),
      error: (err) => this.error.set(this.extractError(err, 'Error al reordenar')),
    });
  }

  seleccionarCampo(c: CampoPlantilla): void {
    this.campoSeleccionadoId.set(c.id);
    this.opcionesTexto.set(c.opciones?.join('\n') ?? '');
  }

  cerrarPanelPropiedades(): void {
    this.campoSeleccionadoId.set(null);
  }

  // ── Edición inline en el panel lateral ─────────────────────
  updateCampoProperty<K extends keyof CampoPlantillaRequest>(key: K, value: CampoPlantillaRequest[K]): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;
    const actualizado = { ...sel, [key]: value } as CampoPlantilla;
    // El ID interno (nombre) siempre se deriva de la etiqueta, con desambiguación
    if (key === 'etiqueta') {
      actualizado.nombre = this.generarNombreUnico(value as string, sel.id);
    }
    this.campos.update((lista) => lista.map((c) => (c.id === sel.id ? actualizado : c)));
  }

  private generarNombreUnico(etiqueta: string, excludeId?: string): string {
    const base = slugify(etiqueta) || 'campo';
    const existentes = new Set(
      this.campos().filter((c) => c.id !== excludeId).map((c) => c.nombre),
    );
    if (!existentes.has(base)) return base;
    let i = 2;
    while (existentes.has(`${base}_${i}`)) i++;
    return `${base}_${i}`;
  }

  guardarCampoSeleccionado(): void {
    const sel = this.campoSeleccionado();
    if (!sel) return;

    if (!sel.etiqueta.trim()) {
      this.error.set('La etiqueta visible es obligatoria');
      return;
    }
    if (!sel.nombre.trim() || !/^[a-zA-Z_][a-zA-Z0-9_]{0,49}$/.test(sel.nombre.trim())) {
      this.error.set('Nombre técnico inválido (letras, números o _; debe iniciar con letra o _)');
      return;
    }
    const opciones = this.opcionesPreview();
    if (this.necesitaOpciones() && opciones.length === 0) {
      this.error.set('Este tipo de campo requiere al menos una opción');
      return;
    }

    const payload: CampoPlantillaRequest = {
      nombre: sel.nombre.trim(),
      etiqueta: sel.etiqueta.trim(),
      tipo: sel.tipo,
      obligatorio: sel.obligatorio,
      opciones: this.necesitaOpciones() ? opciones : undefined,
      validacionRegex: sel.validacionRegex?.trim() || undefined,
      formula: sel.tipo === 'calculado' ? (sel.formula?.trim() || '0') : undefined,
      orden: sel.orden,
    };

    this.guardandoCampo.set(true);
    this.formSvc.actualizarCampo(sel.id, payload).subscribe({
      next: (saved) => {
        this.guardandoCampo.set(false);
        this.campos.update((lista) =>
          lista.map((c) => (c.id === saved.id ? saved : c)).sort((a, b) => a.orden - b.orden),
        );
        this.showSuccess('Campo guardado');
      },
      error: (err) => {
        this.guardandoCampo.set(false);
        this.error.set(this.extractError(err, 'Error al guardar campo'));
      },
    });
  }

  eliminarCampo(c: CampoPlantilla, ev?: Event): void {
    ev?.stopPropagation();
    if (!confirm(`¿Eliminar el campo "${c.etiqueta || c.nombre}"?`)) return;
    this.formSvc.eliminarCampo(c.id).subscribe({
      next: () => {
        this.campos.update((lista) => lista.filter((x) => x.id !== c.id));
        if (this.campoSeleccionadoId() === c.id) this.campoSeleccionadoId.set(null);
        this.showSuccess('Campo eliminado');
      },
      error: (err) => this.error.set(this.extractError(err, 'Error al eliminar campo')),
    });
  }

  duplicarCampo(c: CampoPlantilla, ev?: Event): void {
    ev?.stopPropagation();
    const form = this.formulario();
    if (!form) return;
    const existentes = new Set(this.campos().map((x) => x.nombre));
    let nombre = `${c.nombre}_copia`;
    if (existentes.has(nombre)) {
      let i = 2;
      while (existentes.has(`${c.nombre}_copia_${i}`)) i++;
      nombre = `${c.nombre}_copia_${i}`;
    }

    const payload: CampoPlantillaRequest = {
      nombre,
      etiqueta: c.etiqueta,
      tipo: c.tipo,
      obligatorio: c.obligatorio,
      opciones: c.opciones ? [...c.opciones] : undefined,
      validacionRegex: c.validacionRegex,
      formula: c.tipo === 'calculado' ? (c.formula || '0') : undefined,
      orden: this.campos().length + 1,
    };

    this.formSvc.agregarCampo(form.id, payload).subscribe({
      next: (creado) => {
        this.campos.update((lista) => [...lista, creado].sort((a, b) => a.orden - b.orden));
        this.showSuccess('Campo duplicado');
      },
      error: (err) => this.error.set(this.extractError(err, 'Error al duplicar')),
    });
  }

  onOpcionesChange(ev: Event): void {
    const raw = (ev.target as HTMLTextAreaElement).value;
    this.opcionesTexto.set(raw);
  }

  // ── Utilidades de presentación ─────────────────────────────
  tipoLabel(t: TipoCampo): string {
    return this.tiposVisual.find((x) => x.value === t)?.label ?? t;
  }

  tipoIcono(t: TipoCampo): string {
    return this.tiposVisual.find((x) => x.value === t)?.icono ?? '·';
  }

  isCampoSeleccionado(id: string): boolean {
    return this.campoSeleccionadoId() === id;
  }

  private showSuccess(msg: string): void {
    this.exito.set(msg);
    this.error.set('');
    setTimeout(() => this.exito.set(''), 2500);
  }

  private extractError(err: unknown, fallback: string): string {
    const e = err as HttpErrorResponse & { error?: { message?: string } };
    if (typeof e?.error === 'string' && e.error.trim()) return e.error.trim();
    if (e?.error && typeof e.error === 'object' && typeof e.error.message === 'string') {
      return e.error.message;
    }
    if (e?.status) return `${fallback} (HTTP ${e.status})`;
    return fallback;
  }
}
