import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgenteAccion {
  label: string;
  ruta: string;
  tipo: string;
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

  consultar(payload: AgenteConsulta): Observable<AgenteRespuesta> {
    return this.http.post<AgenteRespuesta>(this.url, payload);
  }
}
