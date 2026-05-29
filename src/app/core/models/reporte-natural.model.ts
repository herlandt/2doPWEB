/** CU-41 — Reporte ad-hoc generado a partir de una consulta en lenguaje natural. */
export interface ReporteNaturalRequest {
  consulta: string;
  formatoExport?: 'CSV' | 'XLSX' | 'JSON';
}

export interface ReporteNaturalResponse {
  reporteId: string;
  collection: string;
  filasMuestra: Record<string, unknown>[];
  totalFilas: number;
  urlDescarga?: string | null;
  formato: string;
  /** Pipeline MongoDB serializado, para auditoría. */
  queryGenerada: string;
}
