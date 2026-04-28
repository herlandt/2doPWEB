export interface DiagramaWorkflow {
  id: string;
  nombre: string;
  politicaId?: string;
  creadorId?: string;
  swimlanes: string[];
  versionActual: number;
  estado: string;
  generadoPorIa: boolean;
  promptOriginal?: string;
  fechaCreacion?: string;
  ultimaModificacion?: string;
}

export interface DiagramaRequest {
  nombre: string;
  politicaId?: string;
  swimlanes?: string[];
  estado?: string;
}

export interface NodoDiagrama {
  id: string;
  diagramaId: string;
  tipo: string;
  nombre: string;
  actividadId?: string;
  departamentoId?: string;
  swimlane?: string;
  orden: number;
  posicion?: { x: number; y: number };
}

export interface NodoRequest {
  tipo: string;
  nombre: string;
  actividadId?: string;
  departamentoId?: string;
  swimlane?: string;
  orden?: number;
  posicion?: { x: number; y: number };
}

export interface FlujoTransicion {
  id: string;
  diagramaId: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  tipo: string;
  condicion?: string;
  etiqueta?: string;
}

export interface TransicionRequest {
  nodoOrigenId: string;
  nodoDestinoId: string;
  tipo: string;
  condicion?: string;
  etiqueta?: string;
}

export interface PromptFlowRequest {
  nombreDiagrama: string;
  prompt: string;
  politicaId?: string;
}

export interface PromptFlowResponse {
  diagrama: DiagramaWorkflow;
  nodos: NodoDiagrama[];
  transiciones: FlujoTransicion[];
  promptUsado: string;
}
