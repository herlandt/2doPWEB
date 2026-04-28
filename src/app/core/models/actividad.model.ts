export interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  departamentoId: string;
  funcionarioResponsableId?: string;
  slaHoras: number;
  tipoSalida: string;
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
  tipoSalida: string;
  reutilizable: boolean;
  documentoIds?: string[];
}
