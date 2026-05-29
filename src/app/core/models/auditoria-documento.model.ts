/** CU-37 — Evento inmutable del timeline de auditoría documental. */
export type AccionAuditoria =
  | 'LECTURA'
  | 'DESCARGA'
  | 'SUBIDA'
  | 'NUEVA_VERSION'
  | 'EDICION_EN_VIVO'
  | 'EDICION_GUARDADA'
  | 'BLOQUEO'
  | 'DESBLOQUEO'
  | 'BORRADO';

export const ACCIONES: AccionAuditoria[] = [
  'LECTURA',
  'DESCARGA',
  'SUBIDA',
  'NUEVA_VERSION',
  'EDICION_EN_VIVO',
  'EDICION_GUARDADA',
  'BLOQUEO',
  'DESBLOQUEO',
  'BORRADO',
];

export interface AuditoriaItem {
  id: string;
  documentoArchivoId: string;
  versionId?: string | null;
  usuarioId: string;
  usuarioNombre?: string | null;
  rol?: string | null;
  accion: AccionAuditoria | string;
  ip?: string | null;
  userAgent?: string | null;
  timestamp: string;
  detalle?: Record<string, unknown> | null;
}

/** Página paginada (formato Spring Data Page). */
export interface PageAuditoria {
  content: AuditoriaItem[];
  totalElements: number;
  totalPages: number;
  number: number;   // página actual (0-indexed)
  size: number;
  first?: boolean;
  last?: boolean;
}
