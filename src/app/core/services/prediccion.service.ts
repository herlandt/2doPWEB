import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RutaOptima, TramiteRiesgo } from '../models/tramite-riesgo.model';

/**
 * CU-42 (ruta óptima) y CU-43 (riesgo de demora).
 *
 * El backend delega al microservicio Python; si está caído devuelve 503
 * con código `IA_NO_DISPONIBLE` y el caller debe degradar limpiamente.
 */
@Injectable({ providedIn: 'root' })
export class PrediccionService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** CU-42 — calcula y persiste la ruta sugerida del trámite. */
  rutaOptima(tramiteId: string): Observable<RutaOptima> {
    return this.http.post<RutaOptima>(
      `${this.api}/tramites/${tramiteId}/ruta-optima`,
      {},
    );
  }

  /** CU-43 — lista trámites activos con su riesgo de superar el SLA. */
  enRiesgo(nivel?: 'alto' | 'medio' | 'bajo'): Observable<TramiteRiesgo[]> {
    const params = nivel ? new HttpParams().set('nivel', nivel) : new HttpParams();
    return this.http.get<TramiteRiesgo[]>(`${this.api}/tramites/en-riesgo`, { params });
  }
}
