// Inferencia (forward-pass) en TypeScript puro del clasificador entrenado con
// TensorFlow. Arquitectura: Embedding -> GlobalAveragePooling1D -> Dense(relu) ->
// Dense(relu) -> Dense(softmax). Los pesos se exportan a JSON con
// `ia_service/app/ml/exportar_web.py`. No usa TensorFlow.js ni WASM: corre 100%
// offline en el navegador con unos pocos productos matriz-vector.

import { TextVectorizer } from './text-vectorizer';

interface DenseCapa {
  w: number[][]; // [entradas][salidas]
  b: number[]; // [salidas]
}

interface PesosModelo {
  largoSec: number;
  emb: number[][]; // [filasAlcanzables][dimEmb]
  denses: DenseCapa[];
}

export class ModeloLocal {
  private constructor(
    private readonly pesos: PesosModelo,
    private readonly vectorizer: TextVectorizer,
    private readonly etiquetas: string[],
  ) {}

  /** Descarga pesos + vocabulario + etiquetas (assets en /ml) y arma el modelo. */
  static async cargar(
    pesosUrl: string,
    vocabUrl: string,
    etiquetasUrl: string,
  ): Promise<ModeloLocal> {
    const [pesos, vocab, etiquetas] = await Promise.all([
      ModeloLocal.fetchJson<PesosModelo>(pesosUrl),
      ModeloLocal.fetchJson<string[]>(vocabUrl),
      ModeloLocal.fetchJson<string[]>(etiquetasUrl),
    ]);
    return new ModeloLocal(pesos, new TextVectorizer(vocab), etiquetas);
  }

  private static async fetchJson<T>(url: string): Promise<T> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`No se pudo cargar ${url}: ${r.status}`);
    return (await r.json()) as T;
  }

  /** (etiqueta, confianza) de mayor probabilidad para [texto]. */
  clasificar(texto: string): { etiqueta: string; confianza: number } {
    const probs = this.predecir(texto);
    let mejor = 0;
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[mejor]) mejor = i;
    return { etiqueta: this.etiquetas[mejor], confianza: probs[mejor] };
  }

  /** Probabilidades por etiqueta (índice alineado con `etiquetas`). */
  predecir(texto: string): number[] {
    const seq = this.vectorizer.vectorizar(texto, this.pesos.largoSec);
    const dimEmb = this.pesos.emb[0].length;

    // Embedding + GlobalAveragePooling1D: promedio (incluyendo padding, igual que
    // Keras sin mask_zero) de los vectores de embedding de cada posición.
    const pooled = new Array<number>(dimEmb).fill(0);
    for (const idx of seq) {
      const fila = this.pesos.emb[idx] ?? this.pesos.emb[0];
      for (let j = 0; j < dimEmb; j++) pooled[j] += fila[j];
    }
    for (let j = 0; j < dimEmb; j++) pooled[j] /= seq.length;

    // Capas densas: relu en las intermedias, softmax en la última.
    let h = pooled;
    for (let c = 0; c < this.pesos.denses.length; c++) {
      const z = ModeloLocal.matVec(h, this.pesos.denses[c]);
      h = c < this.pesos.denses.length - 1 ? z.map((v) => (v > 0 ? v : 0)) : ModeloLocal.softmax(z);
    }
    return h;
  }

  private static matVec(x: number[], capa: DenseCapa): number[] {
    const salidas = capa.b.length;
    const out = new Array<number>(salidas);
    for (let j = 0; j < salidas; j++) {
      let s = capa.b[j];
      for (let i = 0; i < x.length; i++) s += x[i] * capa.w[i][j];
      out[j] = s;
    }
    return out;
  }

  private static softmax(z: number[]): number[] {
    const max = Math.max(...z);
    const exp = z.map((v) => Math.exp(v - max));
    const suma = exp.reduce((a, b) => a + b, 0) || 1;
    return exp.map((v) => v / suma);
  }
}
