/** Parte 2 — Repositorio documental asociado 1:1 a una política. */
export interface RepositorioDocumental {
  id: string;
  politicaId: string;
  nombre: string;
  bucketKey: string;
  totalArchivos: number;
  totalBytes: number;
  activo: boolean;
  fechaCreacion?: string;
}
