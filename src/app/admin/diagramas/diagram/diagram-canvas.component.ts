import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  LucideAngularModule,
  LucideIconData,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeftOpen,
  Move,
  Hand,
  MousePointer2,
} from 'lucide-angular';
import {
  Actividad,
} from '../../../core/models/actividad.model';
import { Departamento } from '../../../core/models/departamento.model';
import {
  FlujoTransicion,
  NodoDiagrama,
} from '../../../core/models/diagrama.model';
import {
  CANVAS_HEIGHT,
  GRID_SIZE,
  LANE_HEADER_HEIGHT,
  LANE_WIDTH,
  laneFill,
  laneIndex,
  laneXCenter,
  laneXLeft,
  snapToGrid,
  swimlaneFromX,
} from './lane-helpers';
import { defaultSize, registerCreShapes, shapeFromTipo } from './shapes';

// Tipo opaco — no importamos X6 en top-level (SSR safe)
type AnyGraph = unknown & {
  dispose(): void;
  fromJSON(data: unknown): void;
  toJSON(): unknown;
  zoom(factor?: number): void;
  zoomTo(level: number): void;
  zoomToFit(opts?: unknown): void;
  centerContent(): void;
  on(evt: string, handler: (...a: unknown[]) => void): void;
  off(evt: string, handler?: (...a: unknown[]) => void): void;
  addNode(cfg: unknown): unknown;
  addEdge(cfg: unknown): unknown;
  getCellById(id: string): unknown;
  removeCell(id: string): void;
  clearCells(): void;
  use(plugin: unknown): unknown;
  getPlugin(name: string): unknown;
  resize(w?: number, h?: number): void;
};

export interface NodoCreatedPayload {
  tipo: string;
  swimlane?: string;
  posicion: { x: number; y: number };
  nombre: string;
}

export interface NodoMovedPayload {
  backendId: string;
  posicion: { x: number; y: number };
  swimlane?: string;
}

export interface EdgeCreatedPayload {
  origenBackendId: string;
  destinoBackendId: string;
}

@Component({
  selector: 'app-diagram-canvas',
  imports: [LucideAngularModule, DecimalPipe],
  templateUrl: './diagram-canvas.component.html',
  styleUrl: './diagram-canvas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagramCanvasComponent {
  // ── Inputs ─────────────────────────────────────────────
  readonly nodos = input<NodoDiagrama[]>([]);
  readonly transiciones = input<FlujoTransicion[]>([]);
  readonly swimlanes = input<string[]>(['ATC', 'TEC', 'LEG', 'OPE']);
  readonly actividades = input<Actividad[]>([]);
  readonly departamentos = input<Departamento[]>([]);
  readonly readonly = input<boolean>(false);
  readonly highlightNodoId = input<string | null>(null);

  // ── Outputs ────────────────────────────────────────────
  readonly nodoCreated = output<NodoCreatedPayload>();
  readonly nodoMoved = output<NodoMovedPayload>();
  readonly edgeCreated = output<EdgeCreatedPayload>();
  readonly nodoDeleted = output<string>();
  readonly edgeDeleted = output<string>();
  readonly nodoSelected = output<NodoDiagrama | null>();
  readonly createDepartamento = output<void>();
  readonly createActividad = output<void>();

  // ── Refs ───────────────────────────────────────────────
  protected readonly canvasRef = viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  protected readonly minimapRef = viewChild.required<ElementRef<HTMLDivElement>>('minimap');

  // ── State ──────────────────────────────────────────────
  protected readonly ready = signal(false);
  protected readonly zoomLevel = signal(1);
  protected readonly paletteCollapsed = signal(false);
  // Modos de cursor:
  //   move    → mover nodos (cruz con flechas)
  //   pan     → arrastrar el lienzo (mano)
  //   connect → solo permite conectar enlaces entre nodos (puntero)
  protected readonly cursorMode = signal<'move' | 'pan' | 'connect'>('move');
  protected readonly contextMenu = signal<{
    x: number; y: number; backendId: string; cellType: 'node' | 'edge';
  } | null>(null);

  private graph: AnyGraph | null = null;
  private cellIdByBackendId = new Map<string, string>();
  private backendIdByCellId = new Map<string, string>();
  private edgeBackendId = new Map<string, string>();
  private suppressEvents = false;

  protected readonly icons = {
    zoomIn: ZoomIn as LucideIconData,
    zoomOut: ZoomOut as LucideIconData,
    fit: Maximize2 as LucideIconData,
    trash: Trash2 as LucideIconData,
    undo: Undo2 as LucideIconData,
    redo: Redo2 as LucideIconData,
    panelClose: PanelLeftClose as LucideIconData,
    panelOpen: PanelLeftOpen as LucideIconData,
    modeMove: Move as LucideIconData,
    modePan: Hand as LucideIconData,
    modeConnect: MousePointer2 as LucideIconData,
  };

  protected readonly paletteItems: { tipo: string; label: string; descripcion: string }[] = [
    { tipo: 'inicio',    label: 'Inicio',    descripcion: 'Punto de entrada del flujo' },
    { tipo: 'actividad', label: 'Actividad', descripcion: 'Tarea ejecutada por un departamento' },
    { tipo: 'decision',  label: 'Decisión',  descripcion: 'Bifurcación condicional' },
    { tipo: 'fork',      label: 'Fork',      descripcion: 'División en ramas paralelas' },
    { tipo: 'join',      label: 'Join',      descripcion: 'Confluencia de ramas paralelas' },
    { tipo: 'fin',       label: 'Fin',       descripcion: 'Punto de cierre del flujo' },
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      void this.initGraph();
    });

    effect(() => {
      const _n = this.nodos();
      const _t = this.transiciones();
      const _h = this.highlightNodoId();
      if (this.ready()) {
        this.syncFromInputs();
      }
    });

    // Sincroniza el modo del cursor con la configuración de panning de X6
    effect(() => {
      const mode = this.cursorMode();
      const g = this.graph as unknown as {
        options: { panning: { eventTypes: string[]; enabled: boolean } };
      } | null;
      if (!g) return;
      g.options.panning.enabled = true;
      g.options.panning.eventTypes =
        mode === 'pan' ? ['leftMouseDown', 'rightMouseDown'] : ['rightMouseDown'];
    });

    this.destroyRef.onDestroy(() => {
      this.graph?.dispose();
      this.graph = null;
    });
  }

  // ────────────────────────────────────────────────────────
  // Init
  // ────────────────────────────────────────────────────────
  private async initGraph(): Promise<void> {
    const [{ Graph }, { MiniMap }, { Snapline }, { Selection }, { Keyboard }, { History }] =
      await Promise.all([
        import('@antv/x6'),
        import('@antv/x6-plugin-minimap'),
        import('@antv/x6-plugin-snapline'),
        import('@antv/x6-plugin-selection'),
        import('@antv/x6-plugin-keyboard'),
        import('@antv/x6-plugin-history'),
      ]);

    registerCreShapes(Graph);

    const isReadonly = this.readonly();

    const graph = new Graph({
      container: this.canvasRef().nativeElement,
      autoResize: true,
      background: { color: 'transparent' },
      grid: {
        size: GRID_SIZE,
        visible: true,
        type: 'dot',
        args: [
          { color: '#e2e8f0', thickness: 1 },
          { color: '#cbd5e1', thickness: 1, factor: 4 },
        ],
      },
      // Pan SOLO con botón derecho (la rueda queda libre para zoom)
      panning: { enabled: true, eventTypes: ['rightMouseDown'] },
      // Zoom con la rueda del ratón sin necesidad de Ctrl
      mousewheel: {
        enabled: true,
        zoomAtMousePosition: true,
        modifiers: [],
        minScale: 0.4,
        maxScale: 3,
      },
      // SNAP-TO-GRID al mover: cada nodo se ajusta a la cuadrícula (alinear fácil)
      translating: { restrict: false },
      // Cell-aware: las decoraciones jamás son interactivas; el resto depende
      // del modo del cursor (move / pan / connect).
      interacting: (cellView: { cell: { getData(): { _decoration?: boolean } | null } }) => {
        const data = cellView?.cell?.getData?.() ?? {};
        if ((data as { _decoration?: boolean })._decoration) {
          return {
            nodeMovable: false,
            edgeMovable: false,
            magnetConnectable: false,
            edgeLabelMovable: false,
            arrowheadMovable: false,
            vertexMovable: false,
            useEdgeTools: false,
          };
        }
        if (isReadonly) {
          return { nodeMovable: false, edgeMovable: false, magnetConnectable: false, edgeLabelMovable: false };
        }
        const mode = this.cursorMode();
        if (mode === 'pan') {
          return { nodeMovable: false, edgeMovable: false, magnetConnectable: false, edgeLabelMovable: false };
        }
        if (mode === 'connect') {
          return { nodeMovable: false, edgeMovable: false, magnetConnectable: true, edgeLabelMovable: false };
        }
        // mode === 'move'
        return { nodeMovable: true, edgeMovable: true, edgeLabelMovable: true, magnetConnectable: false };
      },
      connecting: {
        snap: { radius: 32 },
        allowBlank: false,
        allowLoop: false,
        allowNode: false,
        allowEdge: false,
        allowMulti: 'withPort',
        highlight: true,
        router: { name: 'orth' },
        connector: { name: 'rounded', args: { radius: 6 } },
        createEdge() {
          return this.createEdge({ shape: 'cre-edge' });
        },
        validateConnection({ sourceCell, targetCell }) {
          return !!sourceCell && !!targetCell && sourceCell !== targetCell;
        },
      },
      highlighting: {
        magnetAdsorbed: {
          name: 'stroke',
          args: { attrs: { stroke: '#1f6feb', 'stroke-width': 3 } },
        },
      },
    }) as unknown as AnyGraph;

    if (!isReadonly) {
      // Snapline: muestra guías cuando un nodo se alinea con otro
      graph.use(new Snapline({ enabled: true, sharp: true, clean: true, tolerance: 8 }));
      graph.use(
        new Selection({
          enabled: true,
          rubberband: true,
          showNodeSelectionBox: true,
          modifiers: ['shift'],
        }),
      );
      graph.use(new Keyboard({ enabled: true, global: false }));
      graph.use(new History({ enabled: true, beforeAddCommand: () => !this.suppressEvents }));
    }

    graph.use(
      new MiniMap({
        container: this.minimapRef().nativeElement,
        width: 200,
        height: 140,
        padding: 10,
      }),
    );

    this.graph = graph;
    this.bindEvents(graph, Graph);
    this.drawSwimlanes();
    this.syncFromInputs();
    this.ready.set(true);

    // Cursor dinámico según modo — se hace vía JS porque el CSS de componente no penetra en el SVG de X6
    const canvasEl = this.canvasRef().nativeElement;
    canvasEl.addEventListener('mousedown', () => {
      if (this.cursorMode() === 'pan') canvasEl.style.cursor = 'grabbing';
    });
    canvasEl.addEventListener('mouseup', () => {
      if (this.cursorMode() === 'pan') canvasEl.style.cursor = 'grab';
    });
    // Cerrar menú contextual con clic fuera
    const closeCtx = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (!target.closest('.ctx-menu')) this.contextMenu.set(null);
    };
    document.addEventListener('mousedown', closeCtx);
    this.destroyRef.onDestroy(() => document.removeEventListener('mousedown', closeCtx));

    // Zoom inicial al 150% (mejor lectura de los nodos)
    try {
      (graph as unknown as { zoomTo(level: number): void }).zoomTo(1.5);
      this.zoomLevel.set(1.5);
    } catch { /* ignore */ }
  }

  private bindEvents(graph: AnyGraph, _GraphCtor: unknown): void {
    // SNAP a la grilla mientras se arrastra (alineación visible)
    graph.on('node:change:position', ((args: {
      node: {
        id: string;
        getData(): { _decoration?: boolean } | null;
        getPosition(): { x: number; y: number };
        setPosition(x: number, y: number, opts?: unknown): void;
      };
      options: { ui?: boolean };
    }) => {
      if (this.suppressEvents) return;
      if (!args.options?.ui) return;
      const data = args.node.getData?.() ?? {};
      if (data && (data as { _decoration?: boolean })._decoration) return;
      const pos = args.node.getPosition();
      const sx = snapToGrid(pos.x);
      const sy = snapToGrid(pos.y);
      if (sx !== pos.x || sy !== pos.y) {
        args.node.setPosition(sx, sy, { silent: true });
      }
    }) as unknown as (...a: unknown[]) => void);

    graph.on('node:click', ((args: { node: { id: string } }) => {
      this.contextMenu.set(null);
      const backendId = this.backendIdByCellId.get(args.node.id);
      if (!backendId) { this.nodoSelected.emit(null); return; }
      const nodo = this.nodos().find((n) => n.id === backendId);
      this.nodoSelected.emit(nodo ?? null);
    }) as unknown as (...a: unknown[]) => void);

    graph.on('blank:click', (() => {
      this.contextMenu.set(null);
      this.nodoSelected.emit(null);
    }) as unknown as (...a: unknown[]) => void);

    graph.on('node:contextmenu', ((args: { node: { id: string; getData(): { _decoration?: boolean } | null }; e: MouseEvent }) => {
      const data = args.node.getData?.() ?? {};
      if ((data as { _decoration?: boolean })._decoration) return;
      const backendId = this.backendIdByCellId.get(args.node.id);
      if (!backendId) return;
      this.contextMenu.set({ x: args.e.clientX, y: args.e.clientY, backendId, cellType: 'node' });
    }) as unknown as (...a: unknown[]) => void);

    graph.on('edge:contextmenu', ((args: { edge: { id: string }; e: MouseEvent }) => {
      const backendId = this.edgeBackendId.get(args.edge.id);
      if (!backendId) return;
      this.contextMenu.set({ x: args.e.clientX, y: args.e.clientY, backendId, cellType: 'edge' });
    }) as unknown as (...a: unknown[]) => void);

    // Movimiento → persistencia (al soltar)
    graph.on('node:moved', ((args: {
      node: { id: string; getPosition(): { x: number; y: number }; getBBox(): { width: number; height: number } };
    }) => {
      if (this.suppressEvents) return;
      const backendId = this.backendIdByCellId.get(args.node.id);
      if (!backendId) return;
      const pos = args.node.getPosition();
      const size = args.node.getBBox();
      const xCenter = pos.x + size.width / 2;
      const swimlane = swimlaneFromX(xCenter, this.swimlanes());
      this.nodoMoved.emit({ backendId, posicion: { x: pos.x, y: pos.y }, swimlane });
    }) as unknown as (...a: unknown[]) => void);

    graph.on('edge:connected', ((args: {
      isNew: boolean;
      edge: {
        id: string;
        getSourceCellId(): string;
        getTargetCellId(): string;
        getData(): { _synced?: boolean } | null;
      };
    }) => {
      if (this.suppressEvents || !args.isNew) return;
      // Si la arista fue creada programáticamente desde syncFromInputs, ignorarla
      const data = args.edge.getData?.() ?? {};
      if ((data as { _synced?: boolean })._synced) return;

      const sourceCellId = args.edge.getSourceCellId();
      const targetCellId = args.edge.getTargetCellId();
      const origenBackendId = this.backendIdByCellId.get(sourceCellId);
      const destinoBackendId = this.backendIdByCellId.get(targetCellId);
      if (!origenBackendId || !destinoBackendId) return;

      // Eliminar la arista temporal — el backend devolverá la real al re-sincronizar
      try { (this.graph as unknown as { removeCell(id: string): void } | null)?.removeCell(args.edge.id); } catch { /* ignore */ }

      this.edgeCreated.emit({ origenBackendId, destinoBackendId });
    }) as unknown as (...a: unknown[]) => void);

    if (!this.readonly()) {
      const onDelete = () => {
        const selection = (graph as unknown as { getPlugin(n: string): { getSelectedCells(): { id: string; isNode(): boolean; isEdge(): boolean }[] } | null }).getPlugin('selection');
        const cells = selection?.getSelectedCells() ?? [];
        for (const cell of cells) {
          if (cell.isNode()) {
            const backendId = this.backendIdByCellId.get(cell.id);
            if (backendId) this.nodoDeleted.emit(backendId);
          } else if (cell.isEdge()) {
            const eid = this.edgeBackendId.get(cell.id);
            if (eid) this.edgeDeleted.emit(eid);
          }
        }
      };
      this.canvasRef().nativeElement.tabIndex = 0;
      this.canvasRef().nativeElement.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Delete' || ev.key === 'Backspace') {
          ev.preventDefault();
          onDelete();
        }
      });

      // Botón rojo de eliminar sobre cada enlace al hacer hover
      graph.on('edge:mouseenter', ((args: {
        edge: { id: string; addTools(tools: unknown[]): void };
      }) => {
        if (this.suppressEvents) return;
        const backendId = this.edgeBackendId.get(args.edge.id);
        if (!backendId) return;
        const bid = backendId;
        args.edge.addTools([{
          name: 'button',
          args: {
            distance: 0.5,
            markup: [
              {
                tagName: 'circle',
                selector: 'button',
                attrs: { r: 8, fill: '#ef4444', cursor: 'pointer', stroke: '#ffffff', 'stroke-width': 1.5 },
              },
              {
                tagName: 'text',
                textContent: '✕',
                selector: 'icon',
                attrs: { fill: '#ffffff', 'font-size': 11, 'text-anchor': 'middle', 'pointer-events': 'none', dy: '0.35em' },
              },
            ],
            onClick: () => { this.edgeDeleted.emit(bid); },
          },
        }]);
      }) as unknown as (...a: unknown[]) => void);

      graph.on('edge:mouseleave', ((args: { edge: { removeTools(): void } }) => {
        args.edge.removeTools();
      }) as unknown as (...a: unknown[]) => void);
    }
  }

  // ────────────────────────────────────────────────────────
  // Swimlanes VERTICALES (calles)
  // ────────────────────────────────────────────────────────
  private drawSwimlanes(): void {
    if (!this.graph) return;
    const lanes = this.swimlanes();

    // Atributos comunes de bloqueo para decoraciones
    const lockedAttrs = {
      magnet: false,
      pointerEvents: 'none' as const,
    };

    // Marco contenedor exterior
    this.graph.addNode({
      shape: 'rect',
      x: 0,
      y: 0,
      width: lanes.length * LANE_WIDTH,
      height: CANVAS_HEIGHT,
      zIndex: -20,
      movable: false,
      selectable: false,
      attrs: {
        body: {
          fill: '#ffffff',
          stroke: '#475569',
          strokeWidth: 1.5,
          ...lockedAttrs,
        },
      },
      data: { _decoration: true },
    });

    lanes.forEach((name, i) => {
      // Cuerpo de la calle
      this.graph!.addNode({
        shape: 'rect',
        x: laneXLeft(i),
        y: LANE_HEADER_HEIGHT,
        width: LANE_WIDTH,
        height: CANVAS_HEIGHT - LANE_HEADER_HEIGHT,
        zIndex: -10,
        movable: false,
        selectable: false,
        attrs: {
          body: {
            fill: laneFill(i),
            stroke: '#94a3b8',
            strokeWidth: 1,
            ...lockedAttrs,
          },
        },
        data: { _decoration: true },
      });

      // Header (tipo "comprador / vendedor")
      this.graph!.addNode({
        shape: 'rect',
        x: laneXLeft(i),
        y: 0,
        width: LANE_WIDTH,
        height: LANE_HEADER_HEIGHT,
        zIndex: -9,
        movable: false,
        selectable: false,
        attrs: {
          body: {
            fill: '#fff7d6',
            stroke: '#475569',
            strokeWidth: 1,
            ...lockedAttrs,
          },
          label: {
            text: name,
            fill: '#0f172a',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'Inter Variable, Inter, sans-serif',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            pointerEvents: 'none',
          },
        },
        data: { _decoration: true },
      });
    });
  }

  // ────────────────────────────────────────────────────────
  // Sync inputs ↔ graph cells
  // ────────────────────────────────────────────────────────
  private syncFromInputs(): void {
    if (!this.graph) return;

    this.suppressEvents = true;
    try {
      this.removeNonDecorationCells();

      const lanes = this.swimlanes();
      const acts = this.actividades();
      const deps = this.departamentos();
      const nodos = this.nodos();

      // Layout inicial vertical: si no hay posición guardada, apilar por orden.
      // Agrupamos por swimlane y damos cada uno su offset Y según su orden relativo.
      const perLaneCount = new Map<number, number>();

      for (const nodo of nodos) {
        const idx = laneIndex(nodo.swimlane, lanes);
        const size = defaultSize(nodo.tipo);
        const stackIdx = perLaneCount.get(idx) ?? 0;
        perLaneCount.set(idx, stackIdx + 1);

        const fallbackX = laneXCenter(idx) - size.width / 2;
        const fallbackY = LANE_HEADER_HEIGHT + 40 + stackIdx * 100;

        const x = nodo.posicion?.x ?? snapToGrid(fallbackX);
        const y = nodo.posicion?.y ?? snapToGrid(fallbackY);

        const sublabel = this.formatSublabel(nodo, acts, deps);
        const isHighlighted = this.highlightNodoId() === nodo.id;

        const cell = this.graph.addNode({
          shape: shapeFromTipo(nodo.tipo),
          x,
          y,
          ...(nodo.tipo === 'actividad'
            ? {
                attrs: {
                  label: { text: nodo.nombre },
                  sublabel: { text: sublabel },
                  body: isHighlighted
                    ? { stroke: '#f97316', strokeWidth: 3 }
                    : {},
                },
              }
            : {
                label: nodo.nombre,
                attrs: isHighlighted
                  ? { body: { stroke: '#f97316', strokeWidth: 3 } }
                  : {},
              }),
          data: { backendId: nodo.id, tipo: nodo.tipo },
        }) as { id: string };

        this.cellIdByBackendId.set(nodo.id, cell.id);
        this.backendIdByCellId.set(cell.id, nodo.id);
      }

      for (const t of this.transiciones()) {
        const src = this.cellIdByBackendId.get(t.nodoOrigenId);
        const dst = this.cellIdByBackendId.get(t.nodoDestinoId);
        if (!src || !dst) continue;

        const labels = t.etiqueta
          ? [{ position: 0.5, attrs: { label: { text: t.etiqueta } } }]
          : [];

        const edge = this.graph.addEdge({
          shape: 'cre-edge',
          source: { cell: src },
          target: { cell: dst },
          labels,
          // _synced evita que esta arista se interprete como nueva conexión del usuario
          data: { backendId: t.id, tipo: t.tipo, _synced: true },
          attrs:
            t.tipo === 'condicional'
              ? { line: { stroke: '#f59e0b', strokeDasharray: '6 4' } }
              : t.tipo === 'paralelo'
                ? { line: { stroke: '#06b6d4', strokeWidth: 2 } }
                : {},
        }) as { id: string };

        this.edgeBackendId.set(edge.id, t.id);
      }
    } finally {
      this.suppressEvents = false;
    }
  }

  private removeNonDecorationCells(): void {
    if (!this.graph) return;
    const internal = this.graph as unknown as {
      getCells(): { id: string; getData(): { _decoration?: boolean } | null }[];
      removeCell(id: string): void;
    };
    const cells = internal.getCells();
    for (const c of cells) {
      const d = c.getData?.() ?? {};
      if (!d || !(d as { _decoration?: boolean })._decoration) {
        internal.removeCell(c.id);
      }
    }
    this.cellIdByBackendId.clear();
    this.backendIdByCellId.clear();
    this.edgeBackendId.clear();
  }

  private formatSublabel(
    nodo: NodoDiagrama,
    acts: Actividad[],
    deps: Departamento[],
  ): string {
    const dep = nodo.departamentoId ? deps.find((d) => d.id === nodo.departamentoId) : null;
    const act = nodo.actividadId ? acts.find((a) => a.id === nodo.actividadId) : null;
    const partes: string[] = [];
    if (dep?.codigo) partes.push(dep.codigo);
    if (act?.nombre) partes.push(act.nombre);
    return partes.join(' · ');
  }

  // ────────────────────────────────────────────────────────
  // Drag from palette
  // ────────────────────────────────────────────────────────
  protected onPaletteDragStart(ev: DragEvent, tipo: string): void {
    if (this.readonly()) return;
    ev.dataTransfer?.setData('text/cre-tipo', tipo);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy';
  }

  protected onCanvasDragOver(ev: DragEvent): void {
    if (this.readonly()) return;
    if (ev.dataTransfer?.types.includes('text/cre-tipo')) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'copy';
    }
  }

  protected onCanvasDrop(ev: DragEvent): void {
    if (this.readonly() || !this.graph) return;
    const tipo = ev.dataTransfer?.getData('text/cre-tipo');
    if (!tipo) return;
    ev.preventDefault();

    const local = (this.graph as unknown as {
      clientToLocal(x: number, y: number): { x: number; y: number };
    }).clientToLocal(ev.clientX, ev.clientY);

    const size = defaultSize(tipo);

    const labelByTipo: Record<string, string> = {
      inicio: 'Inicio',
      fin: 'Fin',
      actividad: 'Nueva actividad',
      decision: '¿Decisión?',
      fork: 'Fork',
      join: 'Join',
    };

    const x = snapToGrid(Math.max(0, local.x - size.width / 2));
    const y = snapToGrid(Math.max(LANE_HEADER_HEIGHT + 8, local.y - size.height / 2));
    // La calle se calcula desde el CENTRO del nodo ya colocado (igual que al
    // moverlo: pos.x + width/2), no desde la posición cruda del cursor. Así crear
    // y mover dan la misma calle y el departamento se toma de forma consistente.
    const swimlane = swimlaneFromX(x + size.width / 2, this.swimlanes());

    this.nodoCreated.emit({
      tipo,
      nombre: labelByTipo[tipo] ?? 'Nodo',
      swimlane,
      posicion: { x, y },
    });
  }

  // ────────────────────────────────────────────────────────
  // Toolbar
  // ────────────────────────────────────────────────────────
  protected togglePalette(): void {
    this.paletteCollapsed.update((v) => !v);
    // Forzamos a X6 a recalcular su tamaño tras la transición CSS
    setTimeout(() => {
      try { (this.graph as unknown as { resize(): void } | null)?.resize(); } catch { /* ignore */ }
    }, 220);
  }

  protected setMode(mode: 'move' | 'pan' | 'connect'): void {
    this.cursorMode.set(mode);
    this.contextMenu.set(null);
    const el = this.canvasRef().nativeElement;
    el.style.cursor = mode === 'pan' ? 'grab' : mode === 'connect' ? 'crosshair' : 'default';
  }

  protected onContextMenuDelete(): void {
    const ctx = this.contextMenu();
    if (!ctx) return;
    this.contextMenu.set(null);
    if (ctx.cellType === 'node') {
      this.nodoDeleted.emit(ctx.backendId);
    } else {
      this.edgeDeleted.emit(ctx.backendId);
    }
  }

  protected zoomIn(): void {
    if (!this.graph) return;
    this.graph.zoom(0.1);
    this.zoomLevel.update((v) => Math.min(2.5, Math.round((v + 0.1) * 10) / 10));
  }

  protected zoomOut(): void {
    if (!this.graph) return;
    this.graph.zoom(-0.1);
    this.zoomLevel.update((v) => Math.max(0.4, Math.round((v - 0.1) * 10) / 10));
  }

  protected zoomFit(): void {
    if (!this.graph) return;
    try {
      this.graph.zoomToFit({ padding: 40, maxScale: 1 } as unknown);
      this.zoomLevel.set(1);
    } catch { /* empty */ }
  }

  protected undo(): void {
    const h = this.graph
      ? (this.graph as unknown as { getPlugin(n: string): { undo(): void; canUndo(): boolean } | null }).getPlugin('history')
      : null;
    if (h && h.canUndo()) h.undo();
  }
  protected redo(): void {
    const h = this.graph
      ? (this.graph as unknown as { getPlugin(n: string): { redo(): void; canRedo(): boolean } | null }).getPlugin('history')
      : null;
    if (h && h.canRedo()) h.redo();
  }
}
