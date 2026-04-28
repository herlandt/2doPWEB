export interface TramiteResumen {
  id: string;
  codigo: string;
  politicaId: string;
  politicaNombre?: string;
  clienteId: string;
  clienteNombre?: string;
  estado: string;
  prioridad: number;
  progreso: number;
  fechaInicio: string;
  fechaLimite?: string;
  nodoActualId?: string;
  nodoActualNombre?: string;
}

export interface TramiteDetalle extends TramiteResumen {
  historial: HistorialNodo[];
  nodoActual?: NodoEstado;
}

export interface NodoEstado {
  nodoId: string;
  nombre: string;
  tipo: string;
  departamentoId?: string;
  actividadId?: string;
  estado: string;
  funcionarioId?: string;
  fechaInicio?: string;
}

export interface HistorialNodo {
  nodoId: string;
  nombre: string;
  estado: string;
  funcionarioId?: string;
  fechaCompletado?: string;
  resultado?: string;
  observaciones?: string;
}

export interface CompletarNodoRequest {
  resultado: string;
  observaciones?: string;
  datos?: Record<string, unknown>;
}
