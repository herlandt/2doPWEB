/** Parte 2 — Archivo del repositorio documental (versión actual + metadatos). */
export interface DocumentoArchivo {
  id: string;
  repositorioId: string;
  politicaId: string;
  tramiteId: string;
  actividadId: string;
  nodoId?: string;
  nombreLogico: string;
  /** PDF | IMAGEN | WORD | EXCEL | AUDIO | VIDEO | OTRO */
  tipoDocumento: string;
  obligatorio: boolean;
  versionActualId: string;
  numeroVersionActual: number;
  bloqueadoPor?: string | null;
  fechaBloqueo?: string | null;
  creadoPorId?: string;
  fechaCreacion?: string;
  activo: boolean;
}

/** Respuesta de subida / nueva versión — incluye URL firmada lista para preview. */
export interface DocumentoArchivoResponse {
  documentoArchivoId: string;
  versionId: string;
  numeroVersion: number;
  nombreLogico: string;
  tipoDocumento: string;
  tamanoBytes: number;
  mimeType: string | null;
  autorId: string;
  fechaCreacion: string;
  urlPreview: string | null;
  expiraEn: string | null;
}

/** Payload de subida (campos obligatorios además del archivo). */
export interface SubirDocumentoRequest {
  tramiteId: string;
  actividadId: string;
  nodoId?: string;
  tipoDocumento: TipoDocumento;
  nombreLogico: string;
  obligatorio?: boolean;
}

export type TipoDocumento = 'PDF' | 'IMAGEN' | 'WORD' | 'EXCEL' | 'AUDIO' | 'VIDEO' | 'OTRO';

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  'PDF',
  'IMAGEN',
  'WORD',
  'EXCEL',
  'AUDIO',
  'VIDEO',
  'OTRO',
];

export interface PreviewDocumento {
  urlPreview: string;
  mimeType: string;
  expiraEn: string;
}
