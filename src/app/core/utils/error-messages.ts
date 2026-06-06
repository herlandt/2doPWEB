import { HttpErrorResponse } from '@angular/common/http';

/**
 * Forma esperada del body de error que devuelve el backend.
 *
 * El `GlobalExceptionHandler` del backend responde con un JSON tipo
 * `{ error: '...mensaje...', status, path }`. Otros endpoints pueden devolver
 * `message` o `details` (validaciones). Todo es opcional porque no podemos
 * confiar en que el body siempre tenga la forma esperada.
 */
interface ApiErrorBody {
  message?: string;
  error?: string;
  details?: string[];
}

/**
 * Extrae el mensaje "crudo" enviado por el backend desde un `HttpErrorResponse`.
 *
 * Replica el patrón ya usado en `usuario-form.component.ts`:
 *   `err.error?.message ?? err.error?.error ?? err.error?.details?.[0]`
 * y además cubre el caso en que el body sea directamente un string.
 *
 * @returns el mensaje del backend, o `undefined` si no se pudo extraer uno legible.
 */
function extraerMensajeBackend(err: HttpErrorResponse): string | undefined {
  // El body del backend viaja en `err.error`. Puede ser un objeto, un string,
  // o algo inesperado (null, etc.), por eso narrow antes de acceder a campos.
  const body: unknown = err.error;

  if (typeof body === 'string') {
    const texto = body.trim();
    return texto.length > 0 ? texto : undefined;
  }

  if (body !== null && typeof body === 'object') {
    const apiBody = body as ApiErrorBody;
    const candidato =
      apiBody.message ?? apiBody.error ?? apiBody.details?.[0];

    if (typeof candidato === 'string' && candidato.trim().length > 0) {
      return candidato.trim();
    }
  }

  return undefined;
}

/**
 * Convierte cualquier error (típicamente un `HttpErrorResponse` de
 * `HttpClient`, pero también `Error` u otros) en un mensaje en español
 * amigable y seguro de mostrar al usuario final.
 *
 * Nunca lanza: ante cualquier fallo interno devuelve el `fallback`.
 *
 * @param err      el error capturado (de un `subscribe({ error })` o `catchError`).
 * @param fallback mensaje por defecto si no se puede derivar algo mejor.
 * @returns un string listo para mostrar en la UI.
 */
export function mensajeAmigable(
  err: unknown,
  fallback = 'Ocurrió un error inesperado. Intenta de nuevo.',
): string {
  try {
    if (err instanceof HttpErrorResponse) {
      const mensajeBackend = extraerMensajeBackend(err);

      switch (err.status) {
        case 0:
          // status 0 = el navegador no pudo completar la petición (red caída,
          // CORS, servidor inalcanzable). El body no aporta nada útil aquí.
          return 'Sin conexión con el servidor. Revisa tu red e intenta de nuevo.';
        case 401:
          return 'Tu sesión expiró. Inicia sesión de nuevo.';
        case 403:
          return 'No tienes permiso para esta acción.';
        case 404:
          return 'No se encontró el recurso solicitado.';
        case 413:
          return 'El archivo es demasiado grande.';
        case 400:
        case 409:
        case 422:
          // Errores de validación/negocio: el backend suele explicar el motivo.
          return mensajeBackend ?? 'Datos inválidos. Revisa lo ingresado.';
        case 500:
        case 502:
        case 503:
        case 504:
          // Fallos del servidor: el detalle interno no es útil ni seguro de mostrar.
          return 'El servidor no está disponible ahora. Intenta más tarde.';
        default:
          return mensajeBackend ?? fallback;
      }
    }

    // No es un error HTTP: si es un Error nativo con mensaje legible, úsalo.
    if (err instanceof Error) {
      const mensaje = err.message?.trim();
      if (mensaje && mensaje.length > 0) {
        return mensaje;
      }
    }

    return fallback;
  } catch {
    // Blindaje total: esta función jamás debe propagar una excepción.
    return fallback;
  }
}
