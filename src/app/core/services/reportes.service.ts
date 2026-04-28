import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  // CU-29: Historial completo de trámites con filtros opcionales
  getHistorialTramites(estado?: string, fechaDesde?: string, fechaHasta?: string): Observable<any[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    if (fechaDesde) params = params.set('desde', fechaDesde);
    if (fechaHasta) params = params.set('hasta', fechaHasta);
    return this.http.get<any[]>(`${this.base}/tramites/historial`, { params });
  }

  // CU-26 paso 1: solicitar generación — body { filtros, formato: 'PDF'|'EXCEL'|'CSV' }
  // Responde con { id, ... } del reporte creado
  generarReporte(data: { filtros: Record<string, string>; formato: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/reportes/generar`, data);
  }

  // CU-26 paso 2: descargar el archivo generado como Blob
  descargarReporte(reporteId: string): Observable<Blob> {
    return this.http.get(`${this.base}/reportes/${reporteId}/descargar`, {
      responseType: 'blob',
    });
  }
}
