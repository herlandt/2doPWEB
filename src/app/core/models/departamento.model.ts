export interface Departamento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  jefeId?: string;
  activo: boolean;
  fechaCreacion?: string;
}

export interface DepartamentoRequest {
  codigo: string;
  nombre: string;
  descripcion: string;
  jefeId?: string;
}
