import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConfirmarSugerenciaRequest,
  SugerirPoliticaRequest,
  SugerirPoliticaResponse,
} from '../models/sugerencia-politica.model';

/**
 * CU-40 — Sugerencia automática de política.
 *
 * El cliente describe su trámite y la IA devuelve el top 3 con confianza;
 * tras confirmar se registra el feedback (ACEPTADA / CAMBIADA) para
 * reentrenar el clasificador.
 */
@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  sugerirPolitica(req: SugerirPoliticaRequest): Observable<SugerirPoliticaResponse> {
    return this.http.post<SugerirPoliticaResponse>(
      `${this.api}/tramites/sugerir-politica`,
      req,
    );
  }

  confirmarSugerencia(
    sugerenciaId: string,
    req: ConfirmarSugerenciaRequest,
  ): Observable<unknown> {
    return this.http.post(`${this.api}/sugerencias/${sugerenciaId}/confirmar`, req);
  }

  cancelarSugerencia(sugerenciaId: string): Observable<unknown> {
    return this.http.post(`${this.api}/sugerencias/${sugerenciaId}/cancelar`, {});
  }
}
