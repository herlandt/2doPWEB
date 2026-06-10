import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentoArchivoService } from '../../core/services/documento-archivo.service';
import { TramiteC2Service } from '../../core/services/tramite-c2.service';
import {
  DocumentoArchivo,
  SubirDocumentoRequest,
  TipoDocumento,
  TIPOS_DOCUMENTO,
} from '../../core/models/documento-archivo.model';
import { DictarSeccionComponent } from '../../shared/dictar-seccion/dictar-seccion.component';
import { DictarFormularioResponse } from '../../core/models/dictado-formulario.model';
import { mensajeAmigable } from '../../core/utils/error-messages';

@Component({
  selector: 'app-expediente-digital',
  imports: [RouterLink, DatePipe, DictarSeccionComponent],
  templateUrl: './expediente-digital.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpedienteDigitalComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tramiteC2Svc = inject(TramiteC2Service);
  private readonly authSvc = inject(AuthService);
  private readonly docSvc = inject(DocumentoArchivoService);

  readonly volverUrl = computed(() =>
    this.authSvc.isAdmin() ? '/admin/historial' : '/funcionario/bandeja',
  );

  readonly mostrarAcciones = computed(() => !this.authSvc.isAdmin());

  readonly finalizado = computed(() => {
    const e = this.tramiteEstado()?.estadoActual ?? this.tramiteEstado()?.estado;
    return e === 'Aprobado' || e === 'Rechazado' || e === 'Cancelado';
  });

  readonly tramiteId = this.route.snapshot.params['id'] as string;

  // CU-10
  readonly expediente = signal<any>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  // CU-16 / CU-18 / CU-17 / CU-11 — panel de decisiones
  readonly justificacion = signal('');
  readonly accionSeleccionada = signal('');
  readonly procesando = signal(false);

  // CU-17
  readonly nodoDestinoId = signal('');
  readonly seccionesAnteriores = signal<any[]>([]);

  // CU-17 (extensión): ids de DocumentoArchivo marcados como erróneos al devolver.
  // Solo esos documentos se mandan en `documentosObservados` para que el cliente
  // vea únicamente los que debe corregir.
  readonly documentosObservadosIds = signal<Set<string>>(new Set());

  // CU-11
  readonly funcionarioDestinoId = signal('');
  readonly listaFuncionarios = signal<any[]>([]);

  // CU-30: el dictado por voz se canaliza a través de <app-dictar-seccion>
  // dentro de cada sección activa. El botón micrófono duplicado que vivía
  // en este componente se removió para evitar dos puntos de entrada.

  // CU-34 — documentos del repositorio asociados al trámite
  readonly documentos = signal<DocumentoArchivo[]>([]);
  readonly cargandoDocumentos = signal(false);
  readonly errorDocumentos = signal('');
  readonly previewCargandoId = signal<string | null>(null);

  // CU-33 — subida de documentos al trámite desde el expediente.
  // El backend resuelve/crea el repositorio 1:1 a partir del tramiteId.
  readonly archivoSubir = signal<File | null>(null);
  readonly tipoDocumentoSubir = signal<TipoDocumento>('PDF');
  readonly nombreLogicoSubir = signal('');
  readonly obligatorioSubir = signal(false);
  readonly subiendoDocumento = signal(false);

  readonly tiposDocumento = TIPOS_DOCUMENTO;

  // actividadId / nodoId del paso en curso (lo expone /estado en nodoActual).
  // Son la referencia que el backend usa para validar permiso de escritura y
  // etiquetar el documento subido contra la actividad correcta.
  readonly actividadActualId = computed<string | null>(
    () => this.tramiteEstado()?.nodoActual?.actividadId ?? null,
  );
  readonly nodoActualId = computed<string | null>(
    () => this.tramiteEstado()?.nodoActual?.nodoId ?? null,
  );

  // CU-13c — valores en edición por campoId (no persiste hasta "Guardar borrador").
  readonly valoresEnEdicion = signal<Record<string, string>>({});
  readonly guardandoSeccionId = signal<string | null>(null);
  readonly guardadoOkSeccionId = signal<string | null>(null);

  // Documento de resolución (lo que el trámite entrega al finalizar)
  readonly archivoResolucion = signal<File | null>(null);
  readonly tramiteEstado = signal<any>(null);
  readonly tieneResolucion = computed(() => !!this.tramiteEstado()?.documentoResolucionId);
  readonly hayPendienteRecepcion = computed(() =>
    (this.expediente()?.secciones ?? []).some(
      (s: any) => s.infoSeccion?.estado === 'Pendiente de recepcion',
    ),
  );

  // Nodo decisión (if) que sigue a la actividad actual, si lo hay. El backend lo
  // expone en /estado como decisionSiguiente { pregunta, opciones:[{valor,etiqueta}] }.
  // El funcionario responde la pregunta y su avance enruta por la rama elegida.
  readonly decisionSiguiente = computed<any>(() => this.tramiteEstado()?.decisionSiguiente ?? null);
  readonly respuestaDecision = signal('');

  // Solo ofrecemos la pregunta del if cuando la sección ya fue aceptada (no
  // mientras está "Pendiente de recepción"): primero se recepciona, luego se avanza.
  readonly mostrarDecision = computed<boolean>(
    () => !!this.decisionSiguiente() && !this.hayPendienteRecepcion(),
  );

  // Salidas configuradas por el admin para la actividad del nodo actual. El panel
  // solo muestra los botones de estas acciones. Si la actividad no declara salidas
  // (datos antiguos o nodo sin actividad), no restringimos (se muestran todas).
  readonly salidasActividad = computed<string[]>(
    () => this.tramiteEstado()?.nodoActual?.salidasPosibles ?? [],
  );
  readonly sinRestriccionSalidas = computed(() => this.salidasActividad().length === 0);
  // 'derivar' es legacy = avanzar, lo tratamos como 'completar'.
  readonly puedeAvanzar = computed(
    () =>
      this.sinRestriccionSalidas() ||
      this.salidasActividad().some((s) => s === 'aprobar' || s === 'completar' || s === 'derivar'),
  );
  readonly puedeRechazar = computed(
    () => this.sinRestriccionSalidas() || this.salidasActividad().includes('rechazar'),
  );
  readonly puedeObservar = computed(
    () => this.sinRestriccionSalidas() || this.salidasActividad().includes('observar'),
  );
  // Texto del botón de avance según la posición del nodo: nodo de cierre -> "Aprobar";
  // intermedio -> "Completar / Avanzar"; con decisión (if) pendiente -> "Continuar →".
  readonly textoAvanzar = computed(() => {
    if (this.mostrarDecision()) return 'Continuar →';
    return this.salidasActividad().includes('aprobar') ? 'Aprobar' : 'Completar / Avanzar';
  });

  constructor() {
    this.cargarExpediente();
    this.cargarDocumentos();
    this.cargarEstado();
  }

  private cargarEstado(): void {
    if (!this.tramiteId) return;
    // Evita arrastrar una rama Sí/No de un estado anterior a uno recién cargado.
    this.respuestaDecision.set('');
    this.tramiteC2Svc.getEstado(this.tramiteId).subscribe({
      next: (e) => this.tramiteEstado.set(e),
      error: () => {},
    });
  }

  /** Sección sobre la que el funcionario puede trabajar (recibida, en ejecución u observada). */
  esSeccionEditable(estado: string | undefined): boolean {
    return ['En ejecucion', 'Pendiente de recepcion', 'Observado', 'en_curso'].includes(estado ?? '');
  }

  /**
   * True si la sección corresponde al NODO ACTUAL del trámite. Solo la sección
   * del nodo en curso debe ser editable (botones Guardar/Completar). Si aún no
   * conocemos el nodo actual (p. ej. /estado no respondió), no restringimos para
   * no romper el comportamiento previo basado solo en el estado de la sección.
   */
  esSeccionDelNodoActual(seccion: any): boolean {
    const actual = this.nodoActualId();
    if (!actual) return true;
    return seccion?.infoSeccion?.nodoId === actual;
  }

  /** Sección ya terminada (nuevo "Derivada"; tolera legacy). */
  esSeccionCompletada(estado: string | undefined): boolean {
    return ['Derivada', 'completada', 'completado'].includes(estado ?? '');
  }

  setArchivoResolucion(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.archivoResolucion.set(input.files?.[0] ?? null);
  }

  descargarResolucion(): void {
    this.tramiteC2Svc.descargarResolucion(this.tramiteId).subscribe({
      next: (r) => {
        if (r?.url) window.open(r.url, '_blank', 'noopener');
      },
      error: () => {
        this.error.set('No se pudo obtener la resolución del trámite.');
        setTimeout(() => this.error.set(''), 4000);
      },
    });
  }

  // ── CU-13c: llenado del formulario de la sección activa ───────────────

  setCampoValor(campoId: string, ev: Event): void {
    const target = ev.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    this.valoresEnEdicion.update((curr) => ({ ...curr, [campoId]: target.value }));
  }

  setCampoCheck(campoId: string, ev: Event): void {
    const target = ev.target as HTMLInputElement;
    this.valoresEnEdicion.update((curr) => ({ ...curr, [campoId]: target.checked ? 'true' : 'false' }));
  }

  /** Campo tipo 'radio': fija directamente la opción elegida. */
  setCampoRadio(campoId: string, opcion: string): void {
    this.valoresEnEdicion.update((curr) => ({ ...curr, [campoId]: opcion }));
  }

  /** Valor vigente de un campo (lo editado, o lo persistido). */
  valorActual(campo: any): string {
    const editado = this.valoresEnEdicion()[campo.id];
    return editado !== undefined ? editado : (campo.valor ?? '');
  }

  // ── Campo tipo 'calculado': evaluación segura de la fórmula ─────────────

  /**
   * Evalúa la fórmula del campo sobre los valores vigentes de su sección
   * (otros campos referenciados por su nombre técnico). Devuelve '' si la
   * fórmula no es evaluable (referencias vacías o sintaxis inválida).
   */
  valorCalculado(seccion: any, campo: any, visitados?: Set<string>): string {
    const formula = campo?.formula;
    if (!formula) return '';
    // Guard de ciclos para fórmulas encadenadas (calculado que referencia calculado).
    const vistos = visitados ?? new Set<string>();
    if (vistos.has(campo.id)) return '';
    vistos.add(campo.id);

    const valores = new Map<string, number>();
    for (const c of seccion?.campos ?? []) {
      if (!c?.nombre || c.id === campo.id) continue;
      // Encadenado: un calculado referenciado se evalúa EN VIVO (no su valor
      // persistido, que puede estar desfasado hasta el próximo guardado).
      const crudo = c.tipo === 'calculado'
        ? this.valorCalculado(seccion, c, vistos)
        : this.valorActual(c);
      const n = parseFloat(crudo);
      if (!isNaN(n)) valores.set(String(c.nombre), n);
    }
    const r = this.evaluarExpresion(formula, valores);
    if (r === null || !isFinite(r)) return '';
    return String(Math.round(r * 100) / 100);
  }

  /**
   * Mini-evaluador aritmético SEGURO (sin eval): números, identificadores de
   * campo, + - * / y paréntesis. Gramática por descenso recursivo.
   */
  private evaluarExpresion(expr: string, vars: Map<string, number>): number | null {
    const tokens = expr.match(/\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[()+\-*/]/g);
    if (!tokens || tokens.join('') !== expr.replace(/\s+/g, '')) return null;
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    const factor = (): number | null => {
      const t = peek();
      if (t === undefined) return null;
      if (t === '-') { next(); const f = factor(); return f === null ? null : -f; }
      if (t === '(') {
        next();
        const e = suma();
        if (peek() !== ')') return null;
        next();
        return e;
      }
      if (/^\d/.test(t)) { next(); return parseFloat(t); }
      if (/^[A-Za-z_]/.test(t)) {
        next();
        return vars.has(t) ? (vars.get(t) as number) : null;
      }
      return null;
    };
    const producto = (): number | null => {
      let v = factor();
      if (v === null) return null;
      while (peek() === '*' || peek() === '/') {
        const op = next();
        const f = factor();
        if (f === null) return null;
        v = op === '*' ? v * f : v / f;
      }
      return v;
    };
    const suma = (): number | null => {
      let v = producto();
      if (v === null) return null;
      while (peek() === '+' || peek() === '-') {
        const op = next();
        const p = producto();
        if (p === null) return null;
        v = op === '+' ? v + p : v - p;
      }
      return v;
    };

    const resultado = suma();
    return pos === tokens.length ? resultado : null;
  }

  // ── Campo tipo 'archivo': subir/ver el adjunto de la sección ────────────

  readonly subiendoCampoId = signal<string | null>(null);

  /** DocumentoArchivo referenciado por un campo adjunto (su valor = documentoId). */
  docDeCampo(campo: any): DocumentoArchivo | null {
    const id = this.valorActual(campo);
    if (!id) return null;
    return this.documentos().find((d) => d.id === id) ?? null;
  }

  /** Sube el archivo elegido y enlaza su documentoId como valor del campo. */
  subirCampoArchivo(seccion: any, campo: any, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    // En PARALELO el trámite no tiene nodo único (actividadActualId null): se
    // manda el nodoId de la SECCIÓN de esta rama y el backend resuelve la
    // actividad de ese nodo.
    const actividadId = this.actividadActualId() ?? '';
    const nodoId = this.nodoActualId() ?? seccion?.infoSeccion?.nodoId ?? undefined;
    if (!actividadId && !nodoId) {
      this.error.set('No se pudo determinar la actividad actual del trámite.');
      setTimeout(() => this.error.set(''), 4000);
      return;
    }
    this.subiendoCampoId.set(campo.id);
    this.docSvc
      .subir(this.tramiteId, archivo, {
        tramiteId: this.tramiteId,
        actividadId,
        nodoId,
        tipoDocumento: this.tipoDesdeArchivo(archivo),
        nombreLogico: `${campo.etiqueta || campo.nombre} — ${archivo.name}`,
        obligatorio: !!campo.obligatorio,
      })
      .subscribe({
        next: (resp) => {
          this.subiendoCampoId.set(null);
          // El valor del campo es el id del documento del repositorio.
          this.valoresEnEdicion.update((curr) => ({
            ...curr,
            [campo.id]: resp.documentoArchivoId,
          }));
          this.cargarDocumentos(); // para mostrar nombre/Ver en el render
          input.value = '';
        },
        error: (err: any) => {
          this.subiendoCampoId.set(null);
          this.error.set(this.mensajeErrorSubida(err));
          setTimeout(() => this.error.set(''), 6000);
          input.value = '';
        },
      });
  }

  /**
   * "Reemplazar" = NUEVA VERSIÓN del mismo documento (CU-35): conserva el
   * documentoId del campo (no requiere re-guardar el borrador), mantiene el
   * historial y no deja duplicados activos en el repositorio.
   */
  reemplazarCampoArchivo(campo: any, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    const documentoId = this.valorActual(campo);
    if (!archivo || !documentoId) return;
    this.subiendoCampoId.set(campo.id);
    this.docSvc
      .nuevaVersion(documentoId, archivo, `Reemplazo desde el campo "${campo.etiqueta || campo.nombre}"`)
      .subscribe({
        next: () => {
          this.subiendoCampoId.set(null);
          this.cargarDocumentos();
          input.value = '';
        },
        error: (err: any) => {
          this.subiendoCampoId.set(null);
          this.error.set(this.mensajeErrorSubida(err));
          setTimeout(() => this.error.set(''), 6000);
          input.value = '';
        },
      });
  }

  /** Abre el adjunto de un campo aunque aún no esté en la lista de documentos. */
  verArchivoCampo(campo: any): void {
    const id = this.valorActual(campo);
    if (!id) return;
    this.docSvc.preview(id).subscribe({
      next: (p) => {
        if (p?.urlPreview) window.open(p.urlPreview, '_blank', 'noopener');
      },
      error: () => {
        this.error.set('No se pudo abrir el adjunto.');
        setTimeout(() => this.error.set(''), 4000);
      },
    });
  }

  /** Deriva el tipo del catálogo a partir de la extensión del archivo. */
  private tipoDesdeArchivo(archivo: File): TipoDocumento {
    const ext = (archivo.name.split('.').pop() ?? '').toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'WORD';
    if (['xls', 'xlsx'].includes(ext)) return 'EXCEL';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'IMAGEN';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'AUDIO';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'VIDEO';
    return 'OTRO';
  }

  guardarBorradorSeccion(seccion: any): void {
    const seccionId = seccion?.infoSeccion?.id;
    if (!seccionId) return;

    const editados = this.valoresEnEdicion();
    const campos = (seccion.campos ?? [])
      .map((c: any) => ({
        campoId: c.id,
        // Calculados: se persiste el valor DERIVADO de su fórmula (el usuario no
        // los edita). Resto: lo editado o, si no se tocó, el valor que ya venía.
        valor: c.tipo === 'calculado'
          ? this.valorCalculado(seccion, c)
          : (editados[c.id] !== undefined ? editados[c.id] : (c.valor ?? '')),
      }))
      .filter((c: any) => c.campoId);

    this.guardandoSeccionId.set(seccionId);
    this.guardadoOkSeccionId.set(null);
    this.tramiteC2Svc.guardarBorradorSeccion(seccionId, campos).subscribe({
      next: () => {
        this.guardandoSeccionId.set(null);
        this.guardadoOkSeccionId.set(seccionId);
        // Refrescamos para que los valores del servidor se reflejen en pantalla.
        this.cargarExpediente();
        this.cargarEstado();
        setTimeout(() => this.guardadoOkSeccionId.set(null), 3000);
      },
      error: (err: any) => {
        this.guardandoSeccionId.set(null);
        this.error.set(mensajeAmigable(err, 'No se pudo guardar el borrador'));
      },
    });
  }

  private cargarDocumentos(): void {
    if (!this.tramiteId) return;
    this.cargandoDocumentos.set(true);
    this.errorDocumentos.set('');
    this.docSvc.listarPorTramite(this.tramiteId).subscribe({
      next: (docs) => {
        this.documentos.set(docs);
        this.cargandoDocumentos.set(false);
      },
      error: (err: any) => {
        this.cargandoDocumentos.set(false);
        if (err?.status === 403) {
          this.errorDocumentos.set('Sin permiso de lectura para los documentos de este trámite.');
        } else if (err?.status !== 404) {
          this.errorDocumentos.set('No se pudieron cargar los documentos.');
        }
        // 404 = repositorio aún no creado → lista vacía sin mensaje.
      },
    });
  }

  /** Pide la URL S3 firmada y la abre en una pestaña nueva. */
  verDocumento(doc: DocumentoArchivo): void {
    if (this.previewCargandoId() === doc.id) return;
    this.previewCargandoId.set(doc.id);
    this.docSvc.preview(doc.id).subscribe({
      next: (p) => {
        this.previewCargandoId.set(null);
        if (p?.urlPreview) {
          window.open(p.urlPreview, '_blank', 'noopener');
        }
      },
      error: () => {
        this.previewCargandoId.set(null);
        this.errorDocumentos.set('No se pudo generar la vista previa.');
        setTimeout(() => this.errorDocumentos.set(''), 4000);
      },
    });
  }

  // ── CU-33: subir un documento al trámite desde el expediente ───────────

  setArchivoSubir(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.archivoSubir.set(input.files?.[0] ?? null);
  }

  setTipoDocumentoSubir(ev: Event): void {
    this.tipoDocumentoSubir.set((ev.target as HTMLSelectElement).value as TipoDocumento);
  }

  setNombreLogicoSubir(ev: Event): void {
    this.nombreLogicoSubir.set((ev.target as HTMLInputElement).value);
  }

  setObligatorioSubir(ev: Event): void {
    this.obligatorioSubir.set((ev.target as HTMLInputElement).checked);
  }

  subirDocumento(): void {
    const archivo = this.archivoSubir();
    if (!archivo) {
      this.errorDocumentos.set('Selecciona un archivo para subir.');
      setTimeout(() => this.errorDocumentos.set(''), 4000);
      return;
    }
    const nombreLogico = this.nombreLogicoSubir().trim() || archivo.name;
    const actividadId = this.actividadActualId();
    if (!actividadId) {
      this.errorDocumentos.set('No se pudo determinar la actividad actual del trámite.');
      setTimeout(() => this.errorDocumentos.set(''), 4000);
      return;
    }

    const req: SubirDocumentoRequest = {
      tramiteId: this.tramiteId,
      actividadId,
      nodoId: this.nodoActualId() ?? undefined,
      tipoDocumento: this.tipoDocumentoSubir(),
      nombreLogico,
      obligatorio: this.obligatorioSubir(),
    };

    this.subiendoDocumento.set(true);
    this.errorDocumentos.set('');
    this.docSvc.subir(this.tramiteId, archivo, req).subscribe({
      next: () => {
        this.subiendoDocumento.set(false);
        // Limpiamos el formulario de subida y refrescamos el listado.
        this.archivoSubir.set(null);
        this.nombreLogicoSubir.set('');
        this.obligatorioSubir.set(false);
        this.tipoDocumentoSubir.set('PDF');
        this.exito.set('Documento subido al trámite.');
        setTimeout(() => this.exito.set(''), 4000);
        this.cargarDocumentos();
      },
      error: (err: any) => {
        this.subiendoDocumento.set(false);
        this.errorDocumentos.set(this.mensajeErrorSubida(err));
        setTimeout(() => this.errorDocumentos.set(''), 6000);
      },
    });
  }

  private mensajeErrorSubida(err: any): string {
    switch (err?.status) {
      case 409:
        return 'Documento duplicado (hash)';
      case 403:
        return 'Sin permiso de escritura en esta actividad';
      case 413:
        return 'Archivo > limite';
      case 503:
        return 'Almacenamiento no disponible';
      default:
        return mensajeAmigable(err, 'No se pudo subir el documento.');
    }
  }

  iconoTipoDoc(tipo: string): string {
    switch ((tipo || '').toUpperCase()) {
      case 'PDF':    return '📕';
      case 'IMAGEN': return '🖼️';
      case 'WORD':   return '📝';
      case 'EXCEL':  return '📊';
      case 'AUDIO':  return '🎵';
      case 'VIDEO':  return '🎬';
      default:       return '📄';
    }
  }

  cargarExpediente(): void {
    if (!this.tramiteId) return;
    this.loading.set(true);
    this.error.set('');

    this.tramiteC2Svc.getExpediente(this.tramiteId).subscribe({
      next: (data) => {
        this.expediente.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(mensajeAmigable(err, 'Error al cargar el expediente.'));
        this.loading.set(false);
      },
    });
  }

  // CU-17: carga secciones completadas para selector de retroceso
  prepararDevolucion(): void {
    this.accionSeleccionada.set('DEVOLVER');
    this.nodoDestinoId.set('');
    // Empezamos sin documentos marcados cada vez que se abre el panel de devolución.
    this.documentosObservadosIds.set(new Set());

    if (this.seccionesAnteriores().length === 0) {
      const exp = this.expediente();
      const completadas = (exp?.secciones ?? []).filter((s: any) =>
        this.esSeccionCompletada(s.infoSeccion?.estado),
      );
      this.seccionesAnteriores.set(completadas);
    }

    // Aseguramos que los documentos del trámite estén cargados para poder tildarlos.
    if (this.documentos().length === 0 && !this.cargandoDocumentos()) {
      this.cargarDocumentos();
    }
  }

  /** Marca/desmarca un documento como observado (erróneo) re-emitiendo un new Set. */
  toggleDocumentoObservado(docId: string): void {
    this.documentosObservadosIds.update((curr) => {
      const next = new Set(curr);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }

  /** Aceptar (recepcionar) el trámite: Pendiente de recepción → En ejecución. */
  aceptar(): void {
    this.procesando.set(true);
    this.error.set('');
    this.tramiteC2Svc.aceptarTramite(this.tramiteId).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set('Trámite aceptado. Ahora está en ejecución a tu cargo.');
        this.cargarExpediente();
        this.cargarEstado();
        setTimeout(() => this.exito.set(''), 4000);
      },
      error: (err) => this.manejarError(err),
    });
  }

  // CU-11: carga funcionarios disponibles
  prepararDerivacion(): void {
    this.accionSeleccionada.set('DERIVAR');
    this.funcionarioDestinoId.set('');

    if (this.listaFuncionarios().length === 0) {
      this.tramiteC2Svc.getUsuarios().subscribe({
        next: (data) => {
          this.listaFuncionarios.set(data);
        },
        error: () => this.error.set('No se pudo cargar la lista de funcionarios.'),
      });
    }
  }

  // Mensaje de confirmación contextual (no genérico): "APROBAR" confundía al
  // responder un if (donde el botón realmente "continúa", no aprueba).
  private mensajeConfirmacion(tipo: string): string {
    if (tipo === 'APROBAR') {
      if (this.mostrarDecision()) return '¿Continuar el trámite con la respuesta seleccionada?';
      return this.salidasActividad().includes('aprobar')
        ? '¿Aprobar y cerrar el trámite?'
        : '¿Completar esta actividad y avanzar al siguiente paso?';
    }
    if (tipo === 'RECHAZAR') return '¿Rechazar el trámite definitivamente? Esto lo cierra.';
    if (tipo === 'DEVOLVER') return '¿Devolver el trámite para corrección?';
    if (tipo === 'REASIGNAR' || tipo === 'DERIVAR') return '¿Reasignar el trámite a otro funcionario?';
    return `¿Proceder con: ${tipo}?`;
  }

  // Llama el endpoint correcto según la acción elegida
  ejecutarAccion(tipo: string): void {
    // Regla CU-17: para devolver hay que marcar al menos un documento a corregir.
    if (tipo === 'DEVOLVER' && this.documentosObservadosIds().size === 0) {
      this.error.set('Selecciona al menos un documento a corregir para devolver el trámite.');
      return;
    }

    if (!confirm(this.mensajeConfirmacion(tipo))) return;

    this.procesando.set(true);
    this.error.set('');

    if (tipo === 'APROBAR') {
      // Si el siguiente paso es un nodo decisión (if), el funcionario debe haber
      // respondido la pregunta: avanzamos con completar-nodo enviando la rama
      // elegida ('si'/'no') para que el motor enrute por la transición correcta.
      if (this.mostrarDecision()) {
        const rama = this.respuestaDecision();
        if (!rama) {
          this.procesando.set(false);
          this.error.set('Responde la pregunta para indicar por dónde continúa el trámite.');
          return;
        }
        this.tramiteC2Svc.completarNodo(this.tramiteId, rama, this.justificacion()).subscribe({
          next: () =>
            this.finalizarExitosamente('Actividad completada. El trámite continuó por la respuesta seleccionada.'),
          error: (err) => this.manejarError(err),
        });
        return;
      }
      // Nodo INTERMEDIO o rama en PARALELO (no es cierre): avanzar con completar-nodo,
      // que sí maneja el paralelo y no exige documento de resolución. Solo los nodos
      // de cierre (cuya salida incluye 'aprobar') pasan por decision-final.
      if (!this.salidasActividad().includes('aprobar')) {
        this.tramiteC2Svc.completarNodo(this.tramiteId, undefined, this.justificacion()).subscribe({
          next: () => this.finalizarExitosamente('Actividad completada. El trámite avanzó al siguiente paso.'),
          error: (err) => this.manejarError(err),
        });
        return;
      }
      // Nodo de CIERRE: aprobar (cierra el trámite y gestiona el documento de resolución).
      const archivo = this.archivoResolucion();
      const obs$ = archivo
        ? this.tramiteC2Svc.decisionFinalConResolucion(this.tramiteId, 'Aprobar', this.justificacion(), archivo)
        : this.tramiteC2Svc.decisionFinal(this.tramiteId, 'Aprobar', this.justificacion());
      obs$.subscribe({
        next: () => this.finalizarExitosamente('Trámite aprobado.'),
        error: (err) => this.manejarError(err),
      });
    } else if (tipo === 'RECHAZAR') {
      this.tramiteC2Svc.decisionFinal(this.tramiteId, 'Rechazar', this.justificacion()).subscribe({
        next: () => this.finalizarExitosamente('Trámite rechazado y cerrado.'),
        error: (err) => this.manejarError(err),
      });
    } else if (tipo === 'DEVOLVER') {
      this.tramiteC2Svc
        .devolverTramite(
          this.tramiteId,
          this.nodoDestinoId(),
          this.justificacion(),
          Array.from(this.documentosObservadosIds()),
        )
        .subscribe({
          next: () => this.finalizarExitosamente('Trámite devuelto para corrección.'),
          error: (err) => this.manejarError(err),
        });
    } else if (tipo === 'DERIVAR' || tipo === 'REASIGNAR') {
      this.tramiteC2Svc
        .reasignarTramite(this.tramiteId, this.funcionarioDestinoId(), this.justificacion())
        .subscribe({
          next: () => this.finalizarExitosamente('Trámite reasignado al compañero.'),
          error: (err) => this.manejarError(err),
        });
    }
  }

  setJustificacion(ev: Event): void {
    this.justificacion.set((ev.target as HTMLTextAreaElement).value);
  }

  setRespuestaDecision(valor: string): void {
    this.respuestaDecision.set(valor);
  }

  setNodoDestino(ev: Event): void {
    this.nodoDestinoId.set((ev.target as HTMLSelectElement).value);
  }

  setFuncionarioDestino(ev: Event): void {
    this.funcionarioDestinoId.set((ev.target as HTMLSelectElement).value);
  }

  private finalizarExitosamente(mensaje: string): void {
    this.procesando.set(false);
    alert(mensaje);
    this.router.navigate([this.volverUrl()]);
  }

  private manejarError(err: any): void {
    this.procesando.set(false);
    this.error.set(`Error al procesar la acción: ${mensajeAmigable(err)}`);
  }

  formatearFecha(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-BO');
    } catch {
      return iso;
    }
  }

  // CU-39 · dictado por voz: vuelca las sugerencias de la IA en los campos del
  // formulario de la sección. La IA identifica cada sugerencia por el NOMBRE
  // TÉCNICO del campo (CampoSugerido.campo === campo.nombre); lo traducimos al
  // id de CampoSeccion (la clave de valoresEnEdicion) para que "Guardar borrador"
  // lo persista, y reflejamos el valor en el input al instante.
  onDictadoAplicado(seccion: any, resp: DictarFormularioResponse): void {
    const campos: any[] = seccion?.campos ?? [];
    const porNombre = new Map<string, any>(
      campos.filter((c) => c?.nombre).map((c) => [String(c.nombre), c]),
    );

    const patch: Record<string, string> = {};
    const noCasados: string[] = [];
    let aplicados = 0;

    for (const sug of resp.campos ?? []) {
      const crudo = (sug.valor ?? '').trim();
      if (!crudo) continue; // la IA no extrajo nada para este campo
      const campo = porNombre.get(sug.campo);
      if (!campo?.id) {
        noCasados.push(sug.campo);
        continue;
      }
      const valor = this.normalizarValorDictado(crudo, campo);
      if (valor === null) {
        noCasados.push(sug.campo); // no encaja con el tipo (p. ej. opción inválida)
        continue;
      }
      patch[campo.id] = valor;
      campo.valor = valor; // refleja en el input ([value]="campo.valor")
      campo.fueDictado = true; // enciende el badge "IA"
      aplicados++;
    }

    if (aplicados > 0) {
      this.valoresEnEdicion.update((curr) => ({ ...curr, ...patch }));
      // Re-emitimos la signal para que OnPush refresque los [value]="campo.valor".
      this.expediente.update((e) => (e ? { ...e } : e));
    }

    const extra = noCasados.length
      ? ` (${noCasados.length} sin ubicar: ${noCasados.join(', ')})`
      : '';
    this.exito.set(
      aplicados > 0
        ? `${aplicados} campo(s) rellenado(s) por dictado. Revísalos y pulsa "Guardar borrador".${extra}`
        : `El dictado no mapeó ningún campo de esta sección.${extra}`,
    );
    setTimeout(() => this.exito.set(''), 6000);
  }

  /**
   * Adapta el valor crudo de la IA al formato que espera cada tipo de campo.
   * Devuelve null si el valor no es utilizable para ese tipo (se reporta como
   * "sin ubicar" en vez de meter un valor inválido en el formulario).
   */
  private normalizarValorDictado(valor: string, campo: any): string | null {
    switch (campo?.tipo) {
      case 'checkbox':
        return /^(true|s[ií]|1|ok|x)$/i.test(valor) ? 'true' : 'false';
      case 'select':
      case 'radio': {
        // Dominio cerrado: solo se aplica si coincide con una opción definida.
        const opciones: string[] = campo.opciones ?? [];
        const match = opciones.find((o) => o.toLowerCase() === valor.toLowerCase());
        return match ?? null; // si no coincide con una opción válida, no se aplica
      }
      case 'fecha':
        return this.aIsoFecha(valor); // puede devolver null si no parsea
      default:
        return valor;
    }
  }

  /** Convierte 'dd/MM/yyyy', 'dd/MM' y 'hoy'/'mañana' al ISO 'yyyy-MM-dd' de <input type="date">. */
  private aIsoFecha(valor: string): string | null {
    const v = valor.trim().toLowerCase();
    const hoy = new Date();
    if (v === 'hoy') return this.fechaIso(hoy);
    if (v === 'mañana' || v === 'manana') {
      const m = new Date(hoy);
      m.setDate(m.getDate() + 1);
      return this.fechaIso(m);
    }
    const m = valor.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
    if (!m) return null;
    const dia = +m[1];
    const mes = +m[2];
    let anio = m[3] ? +m[3] : hoy.getFullYear();
    if (anio < 100) anio += 2000;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return `${anio.toString().padStart(4, '0')}-${mes
      .toString()
      .padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
  }

  private fechaIso(d: Date): string {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
      .getDate()
      .toString()
      .padStart(2, '0')}`;
  }
}
