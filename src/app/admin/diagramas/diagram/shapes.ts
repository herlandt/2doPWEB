/**
 * Registro de formas X6 para el diagramador CRE.
 * Mapea los tipos del modelo backend (inicio/fin/actividad/decision/fork/join)
 * a representaciones SVG con la paleta CRE.
 *
 * Importante: este archivo NO importa @antv/x6 en su top-level — la importación
 * la hace el caller dentro de un guard isPlatformBrowser para mantener SSR-safe.
 */
import type { Graph } from '@antv/x6';

const COLORS = {
  brand:        '#ffffff',   //   ← Color principal (blanco)
  brandDark:    '#111827',     // ← Borde oscuro
  text:         '#0f172a',      //← Texto oscuro
  white:        '#ffffff',      //← Blanco puro
  success:      '#ffffff',    //  ← Color éxito (inicio)
  successDark:  '#111827',  //    ← Borde éxito oscuro
  warning:      '#ffffff',     // ← Color advertencia
  warningDark:  '#111827',      //← Borde advertencia oscuro
  warningInk:   '#0f172a',     // ← Texto advertencia
  ink:          '#0f172a',    //  ← Texto oscuro general
  border:       '#94a3b8',  //    ← Bordes grises
};


let registered = false;

export function registerCreShapes(graph: typeof Graph): void {
  if (registered) return;
  registered = true;

  // ── inicio ──────────────────────────────────────────────
  graph.registerNode(
    'cre-inicio',
    {
      inherit: 'circle',
      width: 60,
      height: 60,
      attrs: {
        body: {
          fill: COLORS.success,
          stroke: COLORS.successDark,
          strokeWidth: 2,
          magnet: true,
        },
        label: {
          fill: COLORS.text,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'Inter Variable, Inter, sans-serif',
          textWrap: { width: 50, height: 50, ellipsis: true, breakWord: true },
        },
      },
    },
    true,
  );

  // ── fin (doble círculo) ─────────────────────────────────
  graph.registerNode(
    'cre-fin',
    {
      width: 60,
      height: 60,
      markup: [
        { tagName: 'circle', selector: 'outer' },
        { tagName: 'circle', selector: 'inner' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        outer: {
          r: 28,
          cx: 30,
          cy: 30,
          fill: COLORS.white,
          stroke: COLORS.ink,
          strokeWidth: 2,
          magnet: true,
        },
        inner: {
          r: 20,
          cx: 30,
          cy: 30,
          fill: COLORS.ink,
          stroke: COLORS.ink,
        },
        label: {
          x: 30,
          y: 33,
          textAnchor: 'middle',
          fill: COLORS.white,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'Inter Variable, Inter, sans-serif',
        },
      },
    },
    true,
  );

  // ── actividad (rectángulo redondeado azul con sub-label de depto) ──
  graph.registerNode(
    'cre-actividad',
    {
      width: 180,
      height: 64,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'rect', selector: 'lane' },
        { tagName: 'text', selector: 'label' },
        { tagName: 'text', selector: 'sublabel' },
      ],
      attrs: {
        body: {
          width: 180,
          height: 64,
          rx: 6,
          ry: 6,
          fill: COLORS.brand,
          stroke: COLORS.brandDark,
          strokeWidth: 1.8,
          filter: 'drop-shadow(0 1px 2px rgba(15,23,42,0.1))',
          magnet: true,
        },
        lane: {
          x: 0,
          y: 0,
          width: 2,
          height: 64,
          rx: 2,
          ry: 2,
          fill: '#64748b',
        },
        label: {
          x: 90,
          y: 30,
          textAnchor: 'middle',
          fill: COLORS.text,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'Inter Variable, Inter, sans-serif',
          textWrap: { width: 160, height: 28, ellipsis: true, breakWord: true },
        },
        sublabel: {
          x: 90,
          y: 50,
          textAnchor: 'middle',
          fill: '#475569',
          fontSize: 10,
          fontFamily: 'Inter Variable, Inter, sans-serif',
        },
      },
    },
    true,
  );

  // ── decision (rombo amarillo) ───────────────────────────
  // inherit:'polygon' es CRÍTICO — sin él, X6 no maneja el hit-test ni el
  // movimiento correctamente para nodos con polygon body.
  graph.registerNode(
    'cre-decision',
    {
      inherit: 'polygon',
      width: 120,
      height: 90,
      attrs: {
        body: {
          refPoints: '0,0.5 0.5,0 1,0.5 0.5,1',
          fill: '#fff8c5',
          stroke: COLORS.warningDark,
          strokeWidth: 1.8,
          filter: 'drop-shadow(0 1px 2px rgba(15,23,42,0.1))',
          magnet: true,
        },
        label: {
          fill: COLORS.warningInk,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'Inter Variable, Inter, sans-serif',
          textWrap: { width: 80, height: 50, ellipsis: true, breakWord: true },
        },
      },
    },
    true,
  );

  // ── fork (barra paralela horizontal) ────────────────────
  graph.registerNode(
    'cre-fork',
    {
      width: 140,
      height: 10,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        body: {
          width: 140,
          height: 10,
          rx: 3,
          ry: 3,
          fill: COLORS.ink,
          stroke: COLORS.ink,
          magnet: true,
        },
        label: {
          x: 70,
          y: -8,
          textAnchor: 'middle',
          fill: COLORS.text,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'Inter Variable, Inter, sans-serif',
        },
      },
    },
    true,
  );

  // ── join (alias visual de fork) ─────────────────────────
  graph.registerNode(
    'cre-join',
    {
      width: 140,
      height: 10,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        body: {
          width: 140,
          height: 10,
          rx: 3,
          ry: 3,
          fill: COLORS.ink,
          stroke: COLORS.ink,
          magnet: true,
        },
        label: {
          x: 70,
          y: 22,
          textAnchor: 'middle',
          fill: COLORS.text,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'Inter Variable, Inter, sans-serif',
        },
      },
    },
    true,
  );

  // ── arista por defecto ──────────────────────────────────
  graph.registerEdge(
    'cre-edge',
    {
      attrs: {
        line: {
          stroke: '#64748b',
          strokeWidth: 1.6,
          targetMarker: {
            name: 'block',
            width: 9,
            height: 7,
          },
        },
      },
      router: { name: 'orth' },
      connector: { name: 'rounded', args: { radius: 6 } },
      defaultLabel: {
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          label: {
            fill: COLORS.text,
            fontSize: 11,
            fontWeight: 500,
            fontFamily: 'Inter Variable, Inter, sans-serif',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            pointerEvents: 'none',
          },
          body: {
            ref: 'label',
            fill: COLORS.white,
            stroke: COLORS.border,
            strokeWidth: 1,
            rx: 6,
            ry: 6,
            refWidth: '120%',
            refHeight: '140%',
            refX: '-10%',
            refY: '-20%',
          },
        },
      },
    },
    true,
  );
}

/** Mapea el `tipo` del backend al nombre de forma X6 registrada. */
export function shapeFromTipo(tipo: string): string {
  switch (tipo) {
    case 'inicio': return 'cre-inicio';
    case 'fin': return 'cre-fin';
    case 'actividad': return 'cre-actividad';
    case 'decision': return 'cre-decision';
    case 'fork': return 'cre-fork';
    case 'join': return 'cre-join';
    default: return 'cre-actividad';
  }
}

/** Tamaño aproximado por tipo, útil para layout inicial. */
export function defaultSize(tipo: string): { width: number; height: number } {
  switch (tipo) {
    case 'inicio': case 'fin': return { width: 60, height: 60 };
    case 'decision': return { width: 120, height: 90 };
    case 'fork': case 'join': return { width: 140, height: 10 };
    default: return { width: 180, height: 64 };
  }
}
