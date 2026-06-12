/** Phase 4 — Integridad documental y versionado por trámite. */

export interface VersionResumen {
  numero: number;
  autorId: string;
  hashSha256?: string;
  tamanoBytes: number;
  fecha: string;
  comentario?: string;
}

export interface DocumentoConVersiones {
  documentoId: string;
  nombreLogico: string;
  tipoDocumento: string;
  versionActual: number;
  versiones: VersionResumen[];
}

export interface IntegridadDocumental {
  tramiteId: string;
  cadenaIntegra: boolean;
  primerEslabonRoto?: string | null;
  documentos: DocumentoConVersiones[];
}
