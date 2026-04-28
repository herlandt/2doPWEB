/**
 * Helpers para cálculo de swimlanes (calles) en el canvas.
 * Las calles son VERTICALES: cada departamento ocupa LANE_WIDTH px de ancho.
 * El flujo del diagrama crece de arriba hacia abajo dentro de cada calle.
 */

export const LANE_WIDTH = 360;
export const LANE_HEADER_HEIGHT = 48;
export const CANVAS_HEIGHT = 2600;
export const GRID_SIZE = 20;

export function laneIndex(swimlane: string | null | undefined, swimlanes: readonly string[]): number {
  if (!swimlane) return 0;
  const idx = swimlanes.indexOf(swimlane);
  return idx >= 0 ? idx : 0;
}

export function laneXLeft(idx: number): number {
  return idx * LANE_WIDTH;
}

export function laneXCenter(idx: number): number {
  return idx * LANE_WIDTH + LANE_WIDTH / 2;
}

export function swimlaneFromX(x: number, swimlanes: readonly string[]): string | undefined {
  if (swimlanes.length === 0) return undefined;
  const idx = Math.max(0, Math.min(swimlanes.length - 1, Math.floor(x / LANE_WIDTH)));
  return swimlanes[idx];
}

export function laneFill(idx: number): string {
  return idx % 2 === 0 ? 'rgba(247, 250, 254, 0.85)' : 'rgba(232, 240, 252, 0.55)';
}

export function snapToGrid(value: number, grid = GRID_SIZE): number {
  return Math.round(value / grid) * grid;
}
