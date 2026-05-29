import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ReporteNaturalRequest,
  ReporteNaturalResponse,
} from '../models/reporte-natural.model';

/**
 * CU-41 — Reportes ad-hoc por consulta en lenguaje natural.
 *
 * El microservicio Python interpreta la consulta y devuelve un pipeline MongoDB;
 * el backend lo valida (whitelist de colecciones, sin `$out`/`$merge`/`$function`)
 * y lo ejecuta, devolviendo `filasMuestra` (50 filas) + `totalFilas`.
 */
@Injectable({ providedIn: 'root' })
export class ReporteNaturalService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  generar(req: ReporteNaturalRequest): Observable<ReporteNaturalResponse> {
    return this.http.post<ReporteNaturalResponse>(
      `${this.api}/reportes/consulta-natural`,
      req,
    );
  }
}
