// IA local (deep learning offline en el navegador) — réplica en TypeScript de la
// capa `TextVectorization` de TensorFlow con la que se entrenaron modelo_intencion
// y modelo_politica: lowercase + quitar puntuación + split por espacios + lookup en
// el vocabulario (índice 0 = padding, 1 = OOV/[UNK], vocab[i] -> i+2) + pad/truncate
// a una longitud fija. Es la MISMA estandarización que usa el móvil (text_vectorizer.dart).

export class TextVectorizer {
  private readonly indice = new Map<string, number>();

  constructor(vocabulario: string[]) {
    for (let i = 0; i < vocabulario.length; i++) {
      this.indice.set(vocabulario[i], i + 2); // 0=pad, 1=OOV
    }
  }

  // Equivalente a `string.punctuation` de Python, que es lo que TextVectorization
  // quita por defecto (standardize="lower_and_strip_punctuation").
  private static readonly PUNTUACION = /[!"#$%&()*+,\-./:;<=>?@[\\\]^_`{|}~']/g;
  private static readonly ESPACIOS = /\s+/;

  /** Vectoriza [texto] a una secuencia de enteros de longitud [largo], truncando o
   *  rellenando con ceros (padding) según corresponda. */
  vectorizar(texto: string, largo = 24): number[] {
    const limpio = (texto ?? '').toLowerCase().replace(TextVectorizer.PUNTUACION, '');
    const tokens = limpio.trim().split(TextVectorizer.ESPACIOS).filter((t) => t.length > 0);

    const secuencia = new Array<number>(largo).fill(0);
    for (let i = 0; i < tokens.length && i < largo; i++) {
      secuencia[i] = this.indice.get(tokens[i]) ?? 1; // 1 = fuera de vocabulario (OOV)
    }
    return secuencia;
  }
}
