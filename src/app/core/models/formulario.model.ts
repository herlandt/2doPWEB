export type TipoCampo =
  | 'texto'
  | 'textarea'
  | 'numero'
  | 'fecha'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'archivo'
  | 'calculado'
  | 'tabla';

export interface FormularioPlantilla {
  id: string;
  nodoId: string;
  nombre: string;
  camposPlantillaIds: string[];
  permiteAdjuntos: boolean;
  permiteDictadoVoz: boolean;
}

export interface FormularioPlantillaRequest {
  nombre: string;
  permiteAdjuntos: boolean;
  permiteDictadoVoz: boolean;
}

export interface CampoPlantilla {
  id: string;
  formularioPlantillaId: string;
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  opciones?: string[];
  validacionRegex?: string;
  /** Solo tipo 'calculado': expresión aritmética sobre otros campos (por nombre). */
  formula?: string;
  orden: number;
}

export interface CampoPlantillaRequest {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  opciones?: string[];
  validacionRegex?: string;
  /** Solo tipo 'calculado'. */
  formula?: string;
  orden: number;
}

export const TIPOS_CAMPO: { value: TipoCampo; label: string; necesitaOpciones: boolean }[] = [
  { value: 'texto', label: 'Texto corto', necesitaOpciones: false },
  { value: 'textarea', label: 'Texto largo', necesitaOpciones: false },
  { value: 'numero', label: 'Número', necesitaOpciones: false },
  { value: 'fecha', label: 'Fecha', necesitaOpciones: false },
  { value: 'select', label: 'Lista desplegable', necesitaOpciones: true },
  { value: 'radio', label: 'Opción única (radio)', necesitaOpciones: true },
  { value: 'checkbox', label: 'Casilla (check)', necesitaOpciones: false },
  { value: 'archivo', label: 'Adjunto', necesitaOpciones: false },
  { value: 'calculado', label: 'Calculado (fórmula)', necesitaOpciones: false },
  // Tabla (string grid): reutiliza `opciones` para las COLUMNAS; el valor se
  // guarda como JSON string[][] (filas × celdas) en el mismo campo `valor`.
  { value: 'tabla', label: 'Tabla (grilla)', necesitaOpciones: true },
];
