/** CU-39 — Resultado del dictado de un formulario. */
export interface CampoSugerido {
  campo: string;
  valor: string;
  confianza: number;
}

export interface DictarFormularioResponse {
  transcripcionId: string;
  textoTranscrito: string;
  campos: CampoSugerido[];
}
