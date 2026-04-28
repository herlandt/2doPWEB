export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
  esSistema: boolean;
}
