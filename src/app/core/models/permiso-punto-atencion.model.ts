/** CU-36 — Nivel de acceso documental por punto de atención. */
export type NivelAcceso = 'SOLO_LECTURA' | 'SOLO_EDICION' | 'LECTURA_Y_EDICION';

export const NIVELES_ACCESO: { value: NivelAcceso; label: string; descripcion: string }[] = [
  {
    value: 'SOLO_LECTURA',
    label: 'Solo lectura',
    descripcion: 'El funcionario puede ver documentos pero no subir ni versionar.',
  },
  {
    value: 'SOLO_EDICION',
    label: 'Solo edición',
    descripcion: 'Puede subir y versionar, pero no ver documentos de otras actividades.',
  },
  {
    value: 'LECTURA_Y_EDICION',
    label: 'Lectura y edición',
    descripcion: 'Acceso completo: ver, subir, versionar.',
  },
];

export const TIPOS_DOCUMENTO_VISIBLES: string[] = [
  'PDF',
  'IMAGEN',
  'WORD',
  'EXCEL',
  'AUDIO',
  'VIDEO',
  'OTRO',
];

export interface PermisoPuntoAtencion {
  id?: string;
  politicaId: string;
  actividadId: string;
  nivelAcceso: NivelAcceso;
  tiposDocumentoVisibles?: string[];
  actualizadoPorId?: string;
  fechaActualizacion?: string;
}

export interface PermisoPuntoAtencionRequest {
  politicaId: string;
  actividadId: string;
  nivelAcceso: NivelAcceso;
  tiposDocumentoVisibles?: string[];
}
