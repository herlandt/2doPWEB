import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgenteAccion {
  label?: string;
  ruta?: string;
  tipo?: string;
  dato?: string;
}

export interface AgenteRespuesta {
  idLogBaseDatos?: string;
  respuesta: string;
  accion?: AgenteAccion | null;
  fuente?: string;
}

export interface AgenteConsulta {
  consulta: string;
  moduloActivo: string;
  tramiteIdOpcional?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AgenteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/agente/consultar`;

  /**
   * Consulta al agente IA.
   *
   * Acepta dos formas de invocación:
   *  - consultar(payload)                  → payload completo (compatibilidad).
   *  - consultar(consulta, modulo, tramiteId?) → forma simple usada por el chat web.
   */
  consultar(payload: AgenteConsulta): Observable<AgenteRespuesta>;
  consultar(
    consulta: string,
    modulo: string,
    tramiteIdOpcional?: string | null,
  ): Observable<AgenteRespuesta>;
  consultar(
    consultaOrPayload: string | AgenteConsulta,
    modulo?: string,
    tramiteIdOpcional?: string | null,
  ): Observable<AgenteRespuesta> {
    const payload: AgenteConsulta =
      typeof consultaOrPayload === 'string'
        ? {
            consulta: consultaOrPayload,
            moduloActivo: modulo ?? '',
            tramiteIdOpcional: tramiteIdOpcional ?? null,
          }
        : consultaOrPayload;

    return this.http.post<AgenteRespuesta>(this.url, payload);
  }
}
