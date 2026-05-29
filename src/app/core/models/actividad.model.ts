export type SalidaActividad =
  | 'aprobar'
  | 'rechazar'
  | 'derivar'
  | 'observar'
  | 'completar';

export interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  departamentoId: string;
  funcionarioResponsableId?: string;
  slaHoras: number;
  /**
   * Acciones que el funcionario podrá emitir al completar esta actividad.
   * Debe contener al menos una. Reemplaza al antiguo campo `tipoSalida`.
   */
  salidasPosibles: SalidaActividad[];
  reutilizable: boolean;
  documentoIds?: string[];
  fechaCreacion?: string;
}

export interface ActividadRequest {
  nombre: string;
  descripcion: string;
  departamentoId: string;
  funcionarioResponsableId?: string;
  slaHoras: number;
  salidasPosibles: SalidaActividad[];
  reutilizable: boolean;
  documentoIds?: string[];
}

export interface SalidaInfo {
  value: SalidaActividad;
  label: string;
  descripcion: string;
  icono: string;
  color: 'success' | 'danger' | 'info' | 'warning' | 'secondary';
}

export const SALIDAS_INFO: SalidaInfo[] = [
  {
    value: 'aprobar',
    label: 'Aprobar',
    descripcion: 'Finaliza el trámite con resultado positivo.',
    icono: '✔',
    color: 'success',
  },
  {
    value: 'rechazar',
    label: 'Rechazar',
    descripcion: 'Cierra el trámite definitivamente, no continúa.',
    icono: '✖',
    color: 'danger',
  },
  {
    value: 'derivar',
    label: 'Derivar',
    descripcion: 'Pasa al siguiente paso del flujo (otro funcionario o área).',
    icono: '➜',
    color: 'info',
  },
  {
    value: 'observar',
    label: 'Observar / Devolver',
    descripcion: 'Devuelve al solicitante o paso previo para que corrija.',
    icono: '↺',
    color: 'warning',
  },
  {
    value: 'completar',
    label: 'Completar',
    descripcion: 'Marca la tarea como hecha y avanza el flujo.',
    icono: '◉',
    color: 'secondary',
  },
];
