import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Politica, PoliticaEstadoRequest, PoliticaRequest } from '../models/politica.model';

@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/politicas`;

  listar(soloActivas = false): Observable<Politica[]> {
    const params = soloActivas ? new HttpParams().set('soloActivas', 'true') : undefined;
    return this.http.get<Politica[]>(this.url, { params });
  }

  buscarPorId(id: string): Observable<Politica> {
    return this.http.get<Politica>(`${this.url}/${id}`);
  }

  crear(data: PoliticaRequest): Observable<Politica> {
    return this.http.post<Politica>(this.url, data);
  }

  actualizar(id: string, data: PoliticaRequest): Observable<Politica> {
    return this.http.put<Politica>(`${this.url}/${id}`, data);
  }

  cambiarEstado(id: string, estado: string): Observable<Politica> {
    const body: PoliticaEstadoRequest = { estado };
    return this.http.patch<Politica>(`${this.url}/${id}/estado`, body);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
