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

export interface OpcionDecision {
  valor: string; // etiqueta real de la transición ('si' | 'no') — lo que enruta el motor
  etiqueta: string; // texto legible para el botón ('Sí' | 'No')
  destinoNombre?: string; // nombre del nodo al que lleva esa rama
}

export interface DecisionSiguiente {
  nodoId: string;
  pregunta: string;
  opciones: OpcionDecision[];
}

export interface TramiteDetalle extends TramiteResumen {
  historial: HistorialNodo[];
  nodoActual?: NodoEstado;
  // Cuando el siguiente nodo del flujo es un 'decision' (if), el backend expone
  // aquí su pregunta y las ramas para que el funcionario responda Sí/No al avanzar.
  decisionSiguiente?: DecisionSiguiente;
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
  // Salidas que el admin configuró para la actividad de este nodo; el panel del
  // funcionario solo ofrece los botones de estas acciones.
  salidasPosibles?: string[];
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
  funcionarioId?: string;
  decision?: string;
  notas?: string;
}
