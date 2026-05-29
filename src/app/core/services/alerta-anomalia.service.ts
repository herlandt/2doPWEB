import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertaAnomalia } from '../models/alerta-anomalia.model';

/**
 * CU-45 — Anomalías detectadas por el motor IA en el flujo de los trámites.
 *
 * Cualquier admin puede disparar la detección manualmente con {@link detectar};
 * en producción además corre un scheduler diario.
 */
@Injectable({ providedIn: 'root' })
export class AlertaAnomaliaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/alertas-anomalias`;

  /** Dispara la detección y devuelve las anomalías nuevas creadas. */
  detectar(): Observable<AlertaAnomalia[]> {
    return this.http.post<AlertaAnomalia[]>(`${this.url}/detectar`, {});
  }

  /** Anomalías abiertas (no marcadas como falso positivo). */
  listarAbiertas(): Observable<AlertaAnomalia[]> {
    return this.http.get<AlertaAnomalia[]>(this.url);
  }

  marcarFalsoPositivo(id: string): Observable<AlertaAnomalia> {
    return this.http.post<AlertaAnomalia>(`${this.url}/${id}/marcar-falso-positivo`, {});
  }
}
