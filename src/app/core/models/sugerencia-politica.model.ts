/** CU-40 — Sugerencia de política para iniciar trámite (la app móvil lo usa más). */
export interface SugerirPoliticaRequest {
  descripcion: string;
  audioBase64?: string | null;
}

export interface CandidatoPolitica {
  politicaId: string;
  nombre: string;
  confianza: number;
}

export interface SugerirPoliticaResponse {
  sugerenciaId: string;
  politicaSugeridaId: string;
  confianza: number;
  top3: CandidatoPolitica[];
}

export interface ConfirmarSugerenciaRequest {
  politicaConfirmadaId: string;
}
