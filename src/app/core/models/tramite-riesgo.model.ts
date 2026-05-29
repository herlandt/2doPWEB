/** CU-43 — Resultado de la predicción de riesgo de demora para un trámite. */
export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'desconocido';

export interface TramiteRiesgo {
  tramiteId: string;
  probSuperarSla: number;   // 0..1
  nivel: NivelRiesgo;
  razones: string[];
}

/** CU-42 — Ruta óptima sugerida para un trámite. */
export interface RutaOptima {
  rutaSugerida: string[];
  pasosOmitidos: { nodoId: string; motivo: string }[];
  confianza: number;
  explicacion?: string;
}
