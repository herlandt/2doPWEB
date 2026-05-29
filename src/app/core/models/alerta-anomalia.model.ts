/** CU-45 — Anomalía detectada por la IA en el flujo de un trámite. */
export type CategoriaAnomalia =
  | 'tiempo_atipico'
  | 'secuencia_inusual'
  | 'loop_derivaciones'
  | 'salto_no_autorizado';

export interface AlertaAnomalia {
  id: string;
  tramiteId: string;
  categoria: CategoriaAnomalia | string;
  score: number;
  descripcion: string;
  revisadaPor?: string | null;
  falsoPositivo: boolean;
  fechaDeteccion?: string;
  fechaRevision?: string | null;
}
