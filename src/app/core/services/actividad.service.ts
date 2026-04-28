import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Actividad, ActividadRequest } from '../models/actividad.model';

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/actividades`;

  listar(): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(this.url);
  }

  listarPorDepartamento(deptoId: string): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(`${this.url}?departamentoId=${deptoId}`);
  }

  buscarPorId(id: string): Observable<Actividad> {
    return this.http.get<Actividad>(`${this.url}/${id}`);
  }

  crear(data: ActividadRequest): Observable<Actividad> {
    return this.http.post<Actividad>(this.url, data);
  }

  actualizar(id: string, data: ActividadRequest): Observable<Actividad> {
    return this.http.put<Actividad>(`${this.url}/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
