import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompletarNodoRequest, HistorialNodo, TramiteDetalle, TramiteResumen } from '../models/tramite.model';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/tramites`;

  listarTramites(): Observable<TramiteResumen[]> {
    return this.http.get<TramiteResumen[]>(`${this.url}/mis-pendientes`);
  }

  obtenerEstado(tramiteId: string): Observable<TramiteDetalle> {
    return this.http.get<TramiteDetalle>(`${this.url}/${tramiteId}/estado`);
  }

  completarNodo(tramiteId: string, data: CompletarNodoRequest): Observable<TramiteDetalle> {
    return this.http.post<TramiteDetalle>(`${this.url}/${tramiteId}/completar-nodo`, data);
  }

  obtenerHistorial(tramiteId: string): Observable<HistorialNodo[]> {
    return this.http.get<HistorialNodo[]>(`${this.url}/${tramiteId}/historial`);
  }
}
