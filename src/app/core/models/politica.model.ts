export interface Politica {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  estado: string;
  versionActual: number;
  diagramaId?: string;
  creadorId?: string;
  fechaCreacion?: string;
  fechaActivacion?: string;
  parametros?: Record<string, unknown>;
}

export interface PoliticaRequest {
  nombre: string;
  descripcion: string;
  categoria: string;
  estado: string;
  diagramaId?: string;
}

export interface PoliticaEstadoRequest {
  estado: string;
}
