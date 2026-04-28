import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MetricasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  // CU-24: Métricas de tiempo por trámite
  // Respuesta: List<MetricaTiempo> { tramiteId, actividadId, departamentoId,
  //            tiempoSegundos, superoSla, fechaInicioActividad, fechaFinActividad }
  getMetricasTramite(tramiteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/metricas/tramite/${tramiteId}`);
  }

  // CU-25: Cuellos de botella detectados por @Scheduled del backend
  // Respuesta: List<CuelloBotella> { id, actividadId, departamentoId,
  //            tramitesAcumulados, tiempoPromedio, tiempoEsperado,
  //            desviacionPorcentaje, causaSugerida, fechaDeteccion }
  getCuellosDeBotella(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/metricas/cuellos-botella`);
  }
}
