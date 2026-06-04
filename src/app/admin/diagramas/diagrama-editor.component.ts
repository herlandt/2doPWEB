import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ColaboracionService } from '../../core/services/colaboracion.service';
import { Actividad, SALIDAS_INFO, SalidaActividad, SalidaInfo } from '../../core/models/actividad.model';
import { Departamento } from '../../core/models/departamento.model';
import {
  DiagramaRequest,
  DiagramaWorkflow,
  FlujoTransicion,
  NodoDiagrama,
  NodoRequest,
  TransicionRequest,
} from '../../core/models/diagrama.model';
import { Documento } from '../../core/models/documento.model';
import { Politica } from '../../core/models/politica.model';
import { ActividadService } from '../../core/services/actividad.service';
import { AuthService } from '../../core/services/auth.service';
import { ColaboracionRtService, DiagramaEventoRT } from '../../core/services/colaboracion-rt.service';
import { DepartamentoService } from '../../core/services/departamento.service';
import { DiagramaService } from '../../core/services/diagrama.service';
import { DocumentoService } from '../../core/services/documento.service';
import { PoliticaService } from '../../core/services/politica.service';
import { TramiteC2Service } from '../../core/services/tramite-c2.service';
import {
  DiagramCanvasComponent,
  EdgeCreatedPayload,
  NodoCreatedPayload,
  NodoMovedPayload,
} from './diagram/diagram-canvas.component';
import { swimlaneFromX } from './diagram/lane-helpers';
import { defaultSize } from './diagram/shapes';
import { FormularioDisenadorComponent } from './formulario-disenador.component';

interface FuncionarioOption {
  id: string;
  nombre: string;
  email: string;
  departamentosIds?: string[];
}

@Component({
  selector: 'app-diagrama-editor',
  imports: [RouterLink, DiagramCanvasComponent, FormularioDisenadorComponent],
  templateUrl: './diagrama-editor.component.html',
  styleUrl: './diagrama-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagramaEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly diagramaSvc = inject(DiagramaService);
  private readonly actSvc = inject(ActividadService);
  private readonly deptoSvc = inject(DepartamentoService);
  private readonly docSvc = inject(DocumentoService);
  private readonly politicaSvc = inject(PoliticaService);
  private readonly colabSvc = inject(ColaboracionService);
  private readonly funcSvc = inject(TramiteC2Service);
  private readonly rt = inject(ColaboracionRtService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly diagramaId = this.route.snapshot.params['id'] as string | undefined;
  readonly politicaIdPreseleccionada = (this.route.snapshot.queryParamMap.get('politicaId') ?? '') as string;

  readonly diagrama = signal<DiagramaWorkflow | null>(null);

  /**
   * Solo se pueden editar diagramas en estado 'borrador'. Los publicados son de
   * solo lectura (hay que crear una nueva versión para modificarlos). Se usa para
   * poner el lienzo en modo lectura y bloquear las operaciones de edición con un
   * aviso claro, en vez de dejar que el backend rechace con un error crudo.
   */
  readonly editable = computed(() => {
    const d = this.diagrama();
    return d == null || d.estado === 'borrador';
  });

  /**
   * Departamentos que son calles (swimlanes) de ESTE diagrama. El inspector solo
   * debe ofrecer las calles realmente agregadas al diagrama, no todos los
   * departamentos del sistema (bug: aparecían calles no agregadas).
   *
   * OJO: las calles se guardan con DOS convenciones según el origen del diagrama:
   *   - diagramas manuales / seed  -> CÓDIGO  (p.ej. "ATC")  [DiagramaSeeder]
   *   - diagramas generados por IA -> NOMBRE  (p.ej. "Atención al Cliente")
   *     [PromptFlowService usa Departamento::getNombre]
   * Por eso resolvemos por código O nombre (igual que {@link findDepartamentoFromLane});
   * si comparáramos solo por código, en los diagramas de IA el desplegable quedaba
   * vacío y el inspector mostraba "Sin departamento" aunque el nodo sí lo tuviera.
   */
  readonly departamentosDelDiagrama = computed(() => {
    const lanes = this.diagrama()?.swimlanes ?? [];
    const deps = this.departamentos();
    if (lanes.length === 0) return deps;
    const set = new Set(lanes.map((l) => l.trim().toLowerCase()));
    const enLanes = (d: Departamento) =>
      set.has(d.codigo.trim().toLowerCase()) || set.has(d.nombre.trim().toLowerCase());
    // Garantiza que la calle del nodo seleccionado siempre esté en el desplegable,
    // aunque por algún dato heredado no coincidiera con ninguna lane.
    const selId = this.inspectorDraft()?.departamentoId;
    return deps.filter((d) => enLanes(d) || d.id === selId);
  });
  readonly politicas = signal<Politica[]>([]);
  readonly nodos = signal<NodoDiagrama[]>([]);
  readonly transiciones = signal<FlujoTransicion[]>([]);
  readonly actividades = signal<Actividad[]>([]);
  readonly departamentos = signal<Departamento[]>([]);
  readonly funcionarios = signal<FuncionarioOption[]>([]);
  readonly documentos = signal<Documento[]>([]);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly errorDetalles = signal<string[]>([]);
  readonly exito = signal('');
  // Aviso no bloqueante (p. ej. join → decisión: la pregunta no se podrá mostrar).
  readonly advertencia = signal('');
  readonly selectedNodo = signal<NodoDiagrama | null>(null);

  // Borrador del inspector (lo que el usuario está editando)
  readonly inspectorDraft = signal<NodoDiagrama | null>(null);
  readonly guardandoNodo = signal(false);

  // CU-13b: diseñador de formulario del nodo
  readonly nodoEnDiseno = signal<NodoDiagrama | null>(null);

  // Modales: crear departamento / actividad
  readonly mostrarModalDepto = signal(false);
  readonly mostrarModalActividad = signal(false);

  readonly deptoCodigo = signal('');
  readonly deptoNombre = signal('');
  readonly deptoDescripcion = signal('');

  readonly actNombre = signal('');
  readonly actDescripcion = signal('');
  readonly actDepartamentoId = signal('');
  readonly actFuncionarioResponsableId = signal('');
  readonly actSlaHoras = signal('24');
  readonly actSalidasPosibles = signal<SalidaActividad[]>(['completar']);
  readonly actReutilizable = signal(true);

  readonly salidasInfo: readonly SalidaInfo[] = SALIDAS_INFO;

  toggleActSalida(s: SalidaActividad): void {
    this.actSalidasPosibles.update((curr) =>
      curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s],
    );
  }

  isActSalidaSeleccionada(s: SalidaActividad): boolean {
    return this.actSalidasPosibles().includes(s);
  }

  getSalidaInfo(value: string): SalidaInfo | undefined {
    return this.salidasInfo.find((s) => s.value === value);
  }

  readonly funcionariosFiltrados = computed(() => {
    const deptoId = this.actDepartamentoId();
    const lista = this.funcionarios();
    if (!deptoId) return lista;
    return lista.filter((f) => f.departamentosIds?.includes(deptoId));
  });

  // Actividades disponibles según el departamento del borrador
  readonly actividadesDelDraft = computed(() => {
    const draft = this.inspectorDraft();
    const acts = this.actividades();
    if (!draft?.departamentoId) return acts;
    return acts.filter((a) => a.departamentoId === draft.departamentoId);
  });

  // Documentos requeridos por la actividad del nodo seleccionado.
  // Visible solo cuando el nodo es de tipo "actividad" y tiene actividadId.
  readonly documentosRequeridosDelDraft = computed<Documento[]>(() => {
    const draft = this.inspectorDraft();
    if (!draft || draft.tipo !== 'actividad' || !draft.actividadId) return [];
    const act = this.actividades().find((a) => a.id === draft.actividadId);
    const ids = act?.documentoIds ?? [];
    if (ids.length === 0) return [];
    const mapa = new Map(this.documentos().map((d) => [d.id, d]));
    return ids
      .map((id) => mapa.get(id))
      .filter((d): d is Documento => !!d);
  });

  // Transiciones salientes del nodo decisión seleccionado
  readonly transicionesSalientes = computed(() => {
    const sel = this.selectedNodo();
    if (!sel || sel.tipo !== 'decision') return [];
    return this.transiciones().filter((t) => t.nodoOrigenId === sel.id);
  });

  // ¿Hay cambios pendientes en el inspector?
  readonly inspectorDirty = computed(() => {
    const d = this.inspectorDraft();
    const o = this.selectedNodo();
    if (!d || !o) return false;
    return (
      d.nombre !== o.nombre ||
      d.departamentoId !== o.departamentoId ||
      d.actividadId !== o.actividadId ||
      d.swimlane !== o.swimlane
    );
  });

  // Departamentos seleccionados (códigos) que serán swimlanes del nuevo diagrama
  readonly swimlanesSeleccionadas = signal<string[]>([]);

  readonly nuevoDiagrama = signal<DiagramaRequest>({
    nombre: '',
    politicaId: undefined,
    estado: 'borrador',
    swimlanes: [],
  });

  toggleSwimlane(codigo: string): void {
    this.swimlanesSeleccionadas.update((actuales) =>
      actuales.includes(codigo)
        ? actuales.filter((c) => c !== codigo)
        : [...actuales, codigo],
    );
  }

  isSwimlaneSeleccionada(codigo: string): boolean {
    return this.swimlanesSeleccionadas().includes(codigo);
  }

  constructor() {
    this.politicaSvc.listar().subscribe({
      next: (politicas) => this.politicas.set(politicas),
      error: () => this.error.set('Error al cargar politicas'),
    });

    this.actSvc.listar().subscribe({
      next: (actividades) => this.actividades.set(actividades),
      error: () => this.error.set('Error al cargar actividades'),
    });

    // Carga el catálogo de documentos para resolver los IDs guardados en
    // Actividad.documentoIds a nombre/descripción legibles en el inspector.
    this.docSvc.listar().subscribe({
      next: (docs) => this.documentos.set(docs),
      // Sin documentos seedeados el inspector simplemente no muestra la lista.
      error: () => undefined,
    });

    this.deptoSvc.listar().subscribe({
      next: (departamentos) => this.departamentos.set(departamentos),
      error: () => this.error.set('Error al cargar departamentos'),
    });

    this.funcSvc.getUsuarios().subscribe({
      next: (lista) => this.funcionarios.set(lista as FuncionarioOption[]),
      error: () => this.funcionarios.set([]),
    });

    if (this.diagramaId) {
      this.cargar();
      this.suscribirColaboracionRT(this.diagramaId);
    }
  }

  /**
   * CU-15: aplica en vivo los cambios que hagan otros colaboradores sobre el
   * mismo diagrama. Ignora los eventos cuyo autor es uno mismo (echo).
   */
  private suscribirColaboracionRT(diagramaId: string): void {
    const sub = this.rt.observarDiagrama(diagramaId).subscribe({
      next: (evt) => this.aplicarEventoRemoto(evt),
      error: () => {
        /* la reconexión la maneja RxStomp; sin acción explícita */
      },
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private aplicarEventoRemoto(evt: DiagramaEventoRT): void {
    const miUserId = this.auth.getUserId();
    if (evt.autorId && miUserId && evt.autorId === miUserId) return;

    switch (evt.tipo) {
      case 'nodo-creado': {
        const nuevo = evt.payload as NodoDiagrama;
        this.nodos.update((lista) =>
          lista.some((n) => n.id === nuevo.id) ? lista : [...lista, nuevo],
        );
        break;
      }
      case 'nodo-actualizado': {
        const actualizado = evt.payload as NodoDiagrama;
        this.nodos.update((lista) =>
          lista.map((n) => (n.id === actualizado.id ? actualizado : n)),
        );
        if (this.selectedNodo()?.id === actualizado.id) {
          this.selectedNodo.set(actualizado);
          this.inspectorDraft.set({ ...actualizado });
        }
        break;
      }
      case 'nodo-eliminado': {
        const id = (evt.payload as { id: string })?.id;
        if (!id) break;
        this.nodos.update((lista) => lista.filter((n) => n.id !== id));
        this.transiciones.update((lista) =>
          lista.filter((t) => t.nodoOrigenId !== id && t.nodoDestinoId !== id),
        );
        if (this.selectedNodo()?.id === id) {
          this.selectedNodo.set(null);
          this.inspectorDraft.set(null);
        }
        break;
      }
      case 'trans-creada': {
        const nueva = evt.payload as FlujoTransicion;
        this.transiciones.update((lista) =>
          lista.some((t) => t.id === nueva.id) ? lista : [...lista, nueva],
        );
        break;
      }
      case 'trans-actualizada': {
        const actualizada = evt.payload as FlujoTransicion;
        this.transiciones.update((lista) =>
          lista.map((t) => (t.id === actualizada.id ? actualizada : t)),
        );
        break;
      }
      case 'trans-eliminada': {
        const id = (evt.payload as { id: string })?.id;
        if (id) {
          this.transiciones.update((lista) => lista.filter((t) => t.id !== id));
        }
        break;
      }
    }
  }

  abrirModalDepto(): void {
    this.deptoCodigo.set('');
    this.deptoNombre.set('');
    this.deptoDescripcion.set('');
    this.mostrarModalDepto.set(true);
  }

  cerrarModalDepto(): void {
    this.mostrarModalDepto.set(false);
  }

  abrirModalActividad(): void {
    this.actNombre.set('');
    this.actDescripcion.set('');
    this.actFuncionarioResponsableId.set('');
    this.actSlaHoras.set('24');
    this.actSalidasPosibles.set(['completar']);
    this.actReutilizable.set(true);
    const draft = this.inspectorDraft();
    this.actDepartamentoId.set(draft?.departamentoId ?? '');
    this.mostrarModalActividad.set(true);
  }

  onActDepartamentoChange(ev: Event): void {
    const deptoId = (ev.target as HTMLSelectElement).value;
    this.actDepartamentoId.set(deptoId);

    const funcId = this.actFuncionarioResponsableId();
    if (!funcId) return;
    const funcionario = this.funcionarios().find((f) => f.id === funcId);
    if (funcionario && deptoId && !funcionario.departamentosIds?.includes(deptoId)) {
      this.actFuncionarioResponsableId.set('');
    }
  }

  cerrarModalActividad(): void {
    this.mostrarModalActividad.set(false);
  }

  crearDepartamento(): void {
    const codigo = this.deptoCodigo().trim().toUpperCase();
    const nombre = this.deptoNombre().trim();
    const descripcion = this.deptoDescripcion().trim();

    if (!codigo || !nombre) {
      this.setError('Completa codigo y nombre del departamento');
      return;
    }

    this.deptoSvc.crear({ codigo, nombre, descripcion }).subscribe({
      next: (creado) => {
        this.departamentos.update((lista) => [...lista, creado]);
        this.showSuccess('Departamento creado');
        this.cerrarModalDepto();
      },
      error: (err: unknown) => {
        this.setError(this.extractErrorMessage(err, 'Error al crear departamento'), this.extractErrorDetails(err));
      },
    });
  }

  crearActividad(): void {
    const nombre = this.actNombre().trim();
    const descripcion = this.actDescripcion().trim();
    const departamentoId = this.actDepartamentoId();
    const slaHoras = Number(this.actSlaHoras());
    const salidasPosibles = this.actSalidasPosibles();
    const funcionarioResponsableId = this.actFuncionarioResponsableId().trim();

    if (!nombre || !departamentoId || Number.isNaN(slaHoras) || slaHoras <= 0) {
      this.setError('Completa nombre, departamento y SLA valido');
      return;
    }

    if (salidasPosibles.length === 0) {
      this.setError('Selecciona al menos una salida posible para la actividad');
      return;
    }

    // Toda actividad debe poder AVANZAR el trámite; si solo se marca observar/
    // rechazar, el funcionario quedaría sin botón para continuar (trámite atascado).
    if (!salidasPosibles.some((s) => s === 'aprobar' || s === 'completar' || s === 'derivar')) {
      this.setError('La actividad necesita al menos una salida que avance el trámite (Aprobar o Completar).');
      return;
    }

    this.actSvc.crear({
      nombre,
      descripcion,
      departamentoId,
      funcionarioResponsableId: funcionarioResponsableId || undefined,
      slaHoras,
      salidasPosibles,
      reutilizable: this.actReutilizable(),
    }).subscribe({
      next: (creada) => {
        this.actividades.update((lista) => [...lista, creada]);
        this.showSuccess('Actividad creada');
        this.cerrarModalActividad();
      },
      error: (err: unknown) => {
        this.setError(this.extractErrorMessage(err, 'Error al crear actividad'), this.extractErrorDetails(err));
      },
    });
  }

  cargar(): void {
    if (!this.diagramaId) return;

    this.loading.set(true);
    this.clearError();

    this.diagramaSvc.obtenerDiagrama(this.diagramaId).subscribe({
      next: (diagrama) => this.diagrama.set(diagrama),
      error: () => this.error.set('Error al cargar diagrama'),
    });

    this.diagramaSvc.listarNodos(this.diagramaId).subscribe({
      next: (nodos) => this.nodos.set([...nodos].sort((a, b) => a.orden - b.orden)),
      error: () => this.error.set('Error al cargar nodos'),
    });

    this.diagramaSvc.listarTransiciones(this.diagramaId).subscribe({
      next: (transiciones) => {
        this.transiciones.set(transiciones);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar transiciones');
        this.loading.set(false);
      },
    });
  }

  crearDiagrama(nombre: string, politicaId: string, estado: string): void {
    if (!nombre.trim()) {
      this.setError('El nombre del diagrama es obligatorio');
      return;
    }

    const swimlanes = this.swimlanesSeleccionadas();
    if (swimlanes.length === 0) {
      this.setError('Selecciona al menos un departamento como calle del diagrama');
      return;
    }

    const payload: DiagramaRequest = {
      nombre: nombre.trim(),
      politicaId: politicaId || undefined,
      estado,
      swimlanes,
    };

    this.diagramaSvc.crearDiagrama(payload).subscribe({
      next: (diagramaCreado) => {
        this.router.navigate(['/admin/diagramas', diagramaCreado.id]);
      },
      error: (err: unknown) => {
        this.setError(this.extractErrorMessage(err, 'Error al crear diagrama'), this.extractErrorDetails(err));
      },
    });
  }

  onNodoCreated(payload: NodoCreatedPayload): void {
    if (!this.diagramaId) return;
    if (this.bloquearSiNoEditable()) return;

    // La calle/departamento se toma de donde se soltó el nodo. Primero por la
    // etiqueta de calle que reporta el lienzo; si esa no resuelve (llegó vacía o
    // no coincide), se deriva de la POSICIÓN real del nodo (red de seguridad).
    const depto = this.departamentoDeCreacion(payload);

    // Una actividad debe caer dentro de una calle válida (su departamento).
    if (payload.tipo === 'actividad' && !depto) {
      this.setError(
        `No se pudo crear el nodo: la calle "${payload.swimlane ?? 'sin calle'}" no coincide con un departamento.`,
      );
      return;
    }

    // Si la calle ya tiene una actividad registrada la preasignamos por comodidad;
    // si no, el nodo se crea igual con su departamento y el usuario elige la
    // actividad en el inspector. (Antes la falta de actividad BLOQUEABA la
    // creación: por eso "al soltarlo por primera vez no funcionaba".)
    const actividadPorDepto = depto
      ? this.actividades().find((a) => a.departamentoId === depto.id)
      : null;

    const nodoReq: NodoRequest = {
      tipo: payload.tipo,
      nombre: payload.nombre,
      departamentoId: depto?.id,
      actividadId: payload.tipo === 'actividad' ? actividadPorDepto?.id : undefined,
      swimlane: payload.swimlane,
      posicion: payload.posicion,
      orden: this.nodos().length + 1,
    };

    this.diagramaSvc.crearNodo(this.diagramaId, nodoReq).subscribe({
      next: (creado) => {
        // Optimista: añadimos a la lista sin recargar (preserva zoom y cámara)
        this.nodos.update((lista) => [...lista, creado]);
        // Lo seleccionamos al instante para que se vea su calle/departamento sin
        // tener que volver a hacer click ni ajustarlo a mano.
        this.selectedNodo.set(creado);
        this.inspectorDraft.set({ ...creado });
        this.showSuccess('Nodo creado');
      },
      error: (err: unknown) => {
        this.setError(this.extractErrorMessage(err, 'Error al crear nodo'), this.extractErrorDetails(err));
      },
    });
  }

  /** Bloquea una operación de edición si el diagrama está publicado (no editable),
   *  mostrando un aviso claro en vez de dejar que el backend rechace. */
  private bloquearSiNoEditable(): boolean {
    if (!this.editable()) {
      this.setError('El diagrama está publicado: es de solo lectura. Crea una nueva versión para editarlo.');
      return true;
    }
    return false;
  }

  onNodoMoved(payload: NodoMovedPayload): void {
    if (this.bloquearSiNoEditable()) return;
    const actual = this.nodos().find((n) => n.id === payload.backendId);
    if (!actual) return;

    // Si cambió de calle, sincronizamos también el departamento
    const swimlaneNuevo = payload.swimlane ?? actual.swimlane;
    const cambioDeCalle = swimlaneNuevo !== actual.swimlane;
    const deptoMatch = swimlaneNuevo ? this.findDepartamentoFromLane(swimlaneNuevo) : null;
    const departamentoIdNuevo = cambioDeCalle && deptoMatch ? deptoMatch.id : actual.departamentoId;
    // Si cambió de departamento, la actividad anterior puede no aplicar — la limpiamos
    const actividadIdNueva =
      cambioDeCalle && deptoMatch && actual.actividadId
        ? this.actividades().find((a) => a.id === actual.actividadId && a.departamentoId === deptoMatch.id)?.id
        : actual.actividadId;

    // Movimiento dentro de la misma calle → PATCH con solo la posición (ligero,
    // evita reenviar el nodo completo). Cambio de calle → puede mudar de
    // departamento y limpiar la actividad: reemplazo completo con PUT para que
    // esos campos se apliquen (incluido vaciarlos).
    const obs = cambioDeCalle
      ? this.diagramaSvc.actualizarNodo(payload.backendId, {
          tipo: actual.tipo,
          nombre: actual.nombre,
          actividadId: actividadIdNueva,
          departamentoId: departamentoIdNuevo,
          swimlane: swimlaneNuevo,
          orden: actual.orden,
          posicion: payload.posicion,
        })
      : this.diagramaSvc.parchearNodo(payload.backendId, { posicion: payload.posicion });

    obs.subscribe({
      next: (act) => {
        this.nodos.update((lista) => lista.map((n) => (n.id === act.id ? act : n)));
        if (this.selectedNodo()?.id === act.id) {
          this.selectedNodo.set(act);
          this.inspectorDraft.set({ ...act });
        }
      },
      error: (err: unknown) =>
        this.setError(
          this.extractErrorMessage(err, 'Error al guardar posición del nodo'),
          this.extractErrorDetails(err),
        ),
    });
  }

  onEdgeCreated(payload: EdgeCreatedPayload): void {
    if (!this.diagramaId) return;
    if (this.bloquearSiNoEditable()) return;

    const origen = this.nodos().find((n) => n.id === payload.origenBackendId);
    const destino = this.nodos().find((n) => n.id === payload.destinoBackendId);

    // Reglas de topología del nodo de decisión (if): el motor no maneja la pregunta
    // en estas posiciones, así que las bloqueamos con un mensaje claro.
    if (destino?.tipo === 'decision') {
      if (origen?.tipo === 'fork') {
        this.setError('Un "fork" no puede conectar directo a una "decisión". Una rama del fork debe ir a una actividad.');
        return;
      }
      if (origen?.tipo === 'decision') {
        this.setError('No se pueden encadenar dos "decisiones" directamente. Coloca una actividad entre ellas.');
        return;
      }
    }

    const esDecision = origen?.tipo === 'decision';

    let etiqueta: string | undefined;
    if (esDecision) {
      const salientes = this.transiciones().filter((t) => t.nodoOrigenId === payload.origenBackendId);
      const tieneSi = salientes.some((t) => (t.etiqueta ?? '').toLowerCase() === 'si');
      const tieneNo = salientes.some((t) => (t.etiqueta ?? '').toLowerCase() === 'no');

      if (!tieneSi) {
        etiqueta = 'si';
      } else if (!tieneNo) {
        etiqueta = 'no';
      } else {
        this.setError('El nodo de decisión ya tiene sus dos salidas (sí / no). Elimina una antes de crear otra.');
        return;
      }
    }

    const transReq: TransicionRequest = {
      nodoOrigenId: payload.origenBackendId,
      nodoDestinoId: payload.destinoBackendId,
      tipo: esDecision ? 'condicional' : 'secuencial',
      etiqueta,
    };

    this.diagramaSvc.crearTransicion(this.diagramaId, transReq).subscribe({
      next: (creada) => {
        this.transiciones.update((lista) => [...lista, creada]);
        this.showSuccess(esDecision ? `Conexión creada (rama "${etiqueta}")` : 'Conexión creada');
        // join → decisión es válido pero el motor no puede mostrar la pregunta:
        // avisamos para que el admin ponga una actividad intermedia si la quiere.
        if (origen?.tipo === 'join' && destino?.tipo === 'decision') {
          this.advertencia.set(
            '⚠️ La pregunta de una decisión justo después de un "join" no se mostrará al funcionario ' +
              '(el motor tomará "sí" por defecto). Coloca una actividad entre el join y la decisión si necesitas preguntar.',
          );
        }
      },
      error: (err: unknown) => {
        this.setError(this.extractErrorMessage(err, 'Error al crear conexión'), this.extractErrorDetails(err));
      },
    });
  }

  onNodoDeleted(id: string): void {
    if (this.bloquearSiNoEditable()) return;
    if (!confirm('Eliminar nodo y sus conexiones?')) return;

    this.diagramaSvc.eliminarNodo(id).subscribe({
      next: () => {
        this.nodos.update((lista) => lista.filter((n) => n.id !== id));
        this.transiciones.update((lista) =>
          lista.filter((t) => t.nodoOrigenId !== id && t.nodoDestinoId !== id),
        );
        this.showSuccess('Nodo eliminado');
      },
      error: (err: unknown) =>
        this.setError(this.extractErrorMessage(err, 'Error al eliminar nodo'), this.extractErrorDetails(err)),
    });
  }

  onEdgeDeleted(id: string): void {
    if (this.bloquearSiNoEditable()) return;
    this.diagramaSvc.eliminarTransicion(id).subscribe({
      next: () => {
        this.transiciones.update((lista) => lista.filter((t) => t.id !== id));
        this.showSuccess('Conexion eliminada');
      },
      error: (err: unknown) =>
        this.setError(this.extractErrorMessage(err, 'Error al eliminar conexion'), this.extractErrorDetails(err)),
    });
  }

  onNodoSelected(nodo: NodoDiagrama | null): void {
    this.selectedNodo.set(nodo);
    this.inspectorDraft.set(nodo ? { ...nodo } : null);
    this.clearError();
  }

  // ─── Inspector editable ──────────────────────────────────
  updateDraftNombre(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    this.inspectorDraft.update((d) => (d ? { ...d, nombre: value } : d));
  }

  updateDraftDepartamento(ev: Event): void {
    const id = (ev.target as HTMLSelectElement).value || undefined;
    const depto = id ? this.departamentos().find((d) => d.id === id) ?? null : null;
    this.inspectorDraft.update((d) => {
      if (!d) return d;
      // Verificamos si la actividad actual sigue siendo válida con el nuevo depto
      const actActual = d.actividadId
        ? this.actividades().find((a) => a.id === d.actividadId)
        : null;
      const actSigueValida = actActual && (!depto || actActual.departamentoId === depto.id);
      return {
        ...d,
        departamentoId: id,
        // La calle (swimlane) se sincroniza con la etiqueta que el diagrama usa
        // para ese departamento (código o nombre, según el origen del diagrama).
        swimlane: depto ? this.laneLabelForDepartamento(depto) : d.swimlane,
        actividadId: actSigueValida ? d.actividadId : undefined,
      };
    });
  }

  updateDraftActividad(ev: Event): void {
    const id = (ev.target as HTMLSelectElement).value || undefined;
    this.inspectorDraft.update((d) => (d ? { ...d, actividadId: id } : d));
  }

  guardarInspector(): void {
    if (this.bloquearSiNoEditable()) return;
    const draft = this.inspectorDraft();
    if (!draft) return;

    if (!draft.nombre.trim()) {
      this.setError('El nombre del nodo no puede estar vacío');
      return;
    }
    if (draft.tipo === 'actividad' && !draft.departamentoId) {
      this.setError('Las actividades requieren un departamento');
      return;
    }
    if (draft.tipo === 'actividad' && !draft.actividadId) {
      this.setError('Selecciona una actividad para este nodo');
      return;
    }

    const req: NodoRequest = {
      tipo: draft.tipo,
      nombre: draft.nombre.trim(),
      actividadId: draft.actividadId,
      departamentoId: draft.departamentoId,
      swimlane: draft.swimlane,
      orden: draft.orden,
      posicion: draft.posicion,
    };

    this.guardandoNodo.set(true);
    this.diagramaSvc.actualizarNodo(draft.id, req).subscribe({
      next: (actualizado) => {
        this.nodos.update((lista) => lista.map((n) => (n.id === actualizado.id ? actualizado : n)));
        this.selectedNodo.set(actualizado);
        this.inspectorDraft.set({ ...actualizado });
        this.guardandoNodo.set(false);
        this.showSuccess('Nodo actualizado');
      },
      error: (err: unknown) => {
        this.guardandoNodo.set(false);
        this.setError(
          this.extractErrorMessage(err, 'Error al actualizar nodo'),
          this.extractErrorDetails(err),
        );
      },
    });
  }

  descartarInspector(): void {
    const sel = this.selectedNodo();
    this.inspectorDraft.set(sel ? { ...sel } : null);
    this.clearError();
  }

  abrirDisenadorFormulario(): void {
    const nodo = this.selectedNodo();
    if (!nodo) return;
    if (nodo.tipo !== 'actividad') {
      this.setError('Solo los nodos de actividad admiten formulario.');
      return;
    }
    this.nodoEnDiseno.set(nodo);
  }

  cerrarDisenadorFormulario(): void {
    this.nodoEnDiseno.set(null);
  }

  getNombreNodo(nodoId: string): string {
    return this.nodos().find((n) => n.id === nodoId)?.nombre ?? '(nodo)';
  }

  onTransEtiqueta(ev: Event, transicionId: string): void {
    const etiqueta = (ev.target as HTMLSelectElement).value || undefined;
    const trans = this.transiciones().find((t) => t.id === transicionId);
    if (!trans) return;

    const req: TransicionRequest = {
      nodoOrigenId: trans.nodoOrigenId,
      nodoDestinoId: trans.nodoDestinoId,
      tipo: trans.tipo,
      condicion: trans.condicion,
      etiqueta,
    };

    this.diagramaSvc.actualizarTransicion(transicionId, req).subscribe({
      next: (actualizada) => {
        this.transiciones.update((lista) => lista.map((t) => (t.id === actualizada.id ? actualizada : t)));
      },
      error: (err: unknown) =>
        this.setError(this.extractErrorMessage(err, 'Error al actualizar conexión'), this.extractErrorDetails(err)),
    });
  }

  getNombrePolitica(politicaId?: string): string {
    if (!politicaId) return 'Sin politica';
    return this.politicas().find((p) => p.id === politicaId)?.nombre ?? politicaId;
  }

  getNombreActividad(actividadId?: string): string {
    if (!actividadId) return 'Sin actividad';
    return this.actividades().find((a) => a.id === actividadId)?.nombre ?? actividadId;
  }

  getNombreDepto(departamentoId?: string): string {
    if (!departamentoId) return 'Sin depto';
    return this.departamentos().find((d) => d.id === departamentoId)?.codigo ?? departamentoId;
  }

  private showSuccess(message: string): void {
    this.exito.set(message);
    this.clearError();
    setTimeout(() => this.exito.set(''), 3000);
  }

  private clearError(): void {
    this.error.set('');
    this.errorDetalles.set([]);
    this.advertencia.set('');
  }

  private setError(message: string, details: string[] = []): void {
    this.error.set(message);
    this.errorDetalles.set(details);
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const e = err as {
      message?: string;
      error?: { message?: string; error?: string; detail?: string; title?: string } | string;
      status?: number;
      statusText?: string;
    };
    const errorObj =
      e?.error && typeof e.error === 'object'
        ? (e.error as { message?: string; detail?: string; title?: string })
        : undefined;

    if (typeof e?.error === 'string' && e.error.trim()) return e.error.trim();
    if (typeof errorObj?.message === 'string' && errorObj.message.trim()) return errorObj.message.trim();
    if (typeof errorObj?.detail === 'string' && errorObj.detail.trim()) return errorObj.detail.trim();
    if (typeof errorObj?.title === 'string' && errorObj.title.trim()) return errorObj.title.trim();
    // Si hay status, lo preferimos sobre el "Http failure response..." genérico de Angular
    if (e?.status) {
      return `${fallback} — el servidor respondió HTTP ${e.status}${e.statusText ? ` ${e.statusText}` : ''}.`;
    }
    if (typeof e?.message === 'string' && e.message.trim()) return e.message.trim();
    return fallback;
  }

  private extractErrorDetails(err: unknown): string[] {
    const e = err as {
      error?: {
        errors?: unknown;
        details?: unknown;
        violations?: unknown;
      };
    };

    const out: string[] = [];
    const push = (v: unknown): void => {
      if (typeof v === 'string' && v.trim()) {
        out.push(v.trim());
      }
    };

    const scanArray = (v: unknown): void => {
      if (!Array.isArray(v)) return;
      for (const item of v) {
        if (typeof item === 'string') {
          push(item);
          continue;
        }
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          push(obj['message']);
          push(obj['detail']);
          const field = typeof obj['field'] === 'string' ? obj['field'] : undefined;
          const msg = typeof obj['defaultMessage'] === 'string' ? obj['defaultMessage'] : undefined;
          if (field && msg) out.push(`${field}: ${msg}`);
        }
      }
    };

    const scanRecord = (v: unknown): void => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return;
      const obj = v as Record<string, unknown>;
      for (const [k, val] of Object.entries(obj)) {
        if (Array.isArray(val)) {
          const values = val.filter((x) => typeof x === 'string').map((x) => String(x));
          if (values.length > 0) out.push(`${k}: ${values.join(', ')}`);
        } else if (typeof val === 'string' && val.trim()) {
          out.push(`${k}: ${val.trim()}`);
        }
      }
    };

    scanArray(e?.error?.errors);
    scanArray(e?.error?.details);
    scanArray(e?.error?.violations);
    scanRecord(e?.error?.errors);

    return [...new Set(out)].slice(0, 8);
  }

  // ─── CU-15: Colaboración ─────────────────────────────────
  readonly mostrarModalColab = signal(false);
  readonly usuariosDisponibles = signal<any[]>([]);
  readonly cargandoUsuarios = signal(false);
  readonly usuarioInvitadoId = signal('');
  readonly permisosInvitado = signal('editor');
  readonly enviandoInvitacion = signal(false);

  abrirModalColab(): void {
    this.mostrarModalColab.set(true);
    this.usuarioInvitadoId.set('');
    this.permisosInvitado.set('editor');

    if (this.usuariosDisponibles().length === 0) {
      this.cargandoUsuarios.set(true);
      this.colabSvc.getUsuariosDisponibles().subscribe({
        next: (data) => {
          this.usuariosDisponibles.set(data);
          this.cargandoUsuarios.set(false);
        },
        error: () => {
          this.cargandoUsuarios.set(false);
          this.setError('No se pudo cargar la lista de usuarios.');
        },
      });
    }
  }

  cerrarModalColab(): void {
    this.mostrarModalColab.set(false);
  }

  setUsuarioInvitado(ev: Event): void {
    this.usuarioInvitadoId.set((ev.target as HTMLSelectElement).value);
  }

  setPermisosInvitado(ev: Event): void {
    this.permisosInvitado.set((ev.target as HTMLSelectElement).value);
  }

  enviarInvitacion(): void {
    const id = this.diagramaId;
    const usuarioId = this.usuarioInvitadoId();
    if (!id || !usuarioId) return;

    this.enviandoInvitacion.set(true);
    this.colabSvc.invitarColaborador(id, usuarioId, this.permisosInvitado()).subscribe({
      next: () => {
        this.enviandoInvitacion.set(false);
        this.cerrarModalColab();
        this.showSuccess('Invitación enviada correctamente.');
      },
      error: (err: any) => {
        this.enviandoInvitacion.set(false);
        if (err?.status === 400) {
          this.setError('El usuario ya alcanzó el límite de 4 ediciones activas simultáneas.');
        } else {
          this.setError(this.extractErrorMessage(err, 'Error al enviar la invitación.'));
        }
      },
    });
  }

  cambiarEstado(nuevoEstado: string): void {
    if (!this.diagramaId) return;

    this.diagramaSvc.cambiarEstado(this.diagramaId, nuevoEstado).subscribe({
      next: (actualizado) => {
        this.diagrama.set(actualizado);
        this.showSuccess(`Estado cambiado a "${nuevoEstado}"`);
      },
      error: (err: unknown) => {
        this.setError(this.extractErrorMessage(err, 'Error al cambiar estado'), this.extractErrorDetails(err));
      },
    });
  }

  private findDepartamentoFromLane(swimlane: string): Departamento | null {
    const normalized = swimlane.trim().toLowerCase();
    return (
      this.departamentos().find((d) => d.codigo.trim().toLowerCase() === normalized)
      ?? this.departamentos().find((d) => d.nombre.trim().toLowerCase() === normalized)
      ?? null
    );
  }

  /**
   * Departamento al CREAR un nodo desde la paleta. Primero por la etiqueta de
   * calle que reporta el lienzo; si no resuelve (la calle llegó vacía o no
   * coincide por datos/zoom), se deriva de la POSICIÓN del nodo mapeada a las
   * calles del diagrama —la misma fuente con la que el lienzo dibuja las
   * swimlanes—, para que el nodo SIEMPRE tome el departamento de la calle donde
   * se soltó (antes, al soltar desde la paleta, a veces quedaba sin departamento).
   */
  private departamentoDeCreacion(payload: NodoCreatedPayload): Departamento | null {
    if (payload.swimlane) {
      const porCalle = this.findDepartamentoFromLane(payload.swimlane);
      if (porCalle) return porCalle;
    }
    const lanes = this.diagrama()?.swimlanes ?? [];
    if (lanes.length > 0 && payload.posicion) {
      const half = defaultSize(payload.tipo).width / 2;
      const lane = swimlaneFromX(payload.posicion.x + half, lanes);
      if (lane) return this.findDepartamentoFromLane(lane);
    }
    return null;
  }

  /**
   * Etiqueta de calle (swimlane) que ESTE diagrama usa para un departamento.
   * Las calles pueden estar guardadas por código (diagramas manuales/seed) o por
   * nombre (diagramas generados por IA). Elegimos la que realmente exista entre
   * las lanes para que el nodo caiga en la calle correcta; si ninguna coincide
   * (no debería), caemos al código.
   */
  private laneLabelForDepartamento(depto: Departamento): string {
    const lanes = this.diagrama()?.swimlanes ?? [];
    const cod = depto.codigo.trim().toLowerCase();
    const nom = depto.nombre.trim().toLowerCase();
    return (
      lanes.find((l) => l.trim().toLowerCase() === cod)
      ?? lanes.find((l) => l.trim().toLowerCase() === nom)
      ?? depto.codigo
    );
  }
}
