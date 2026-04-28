export interface Documento {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  fechaCreacion?: string;
}

export interface DocumentoRequest {
  nombre: string;
  descripcion: string;
  activo: boolean;
}
