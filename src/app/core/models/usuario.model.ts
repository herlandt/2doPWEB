export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  tipo: string;
  rolId: string;
  activo: boolean;
  departamentosIds?: string[];
  fechaRegistro?: string;
  ultimoAcceso?: string;
}

export interface UsuarioCreateRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  tipo: string;
  departamentosIds?: string[];
}

export interface UsuarioUpdateRequest {
  nombre?: string;
  apellido?: string;
  tipo?: string;
  rolId?: string;
  activo?: boolean;
  departamentosIds?: string[];
}
