import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Documento, DocumentoRequest } from '../models/documento.model';

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/documentos`;

  listar(): Observable<Documento[]> {
    return this.http.get<Documento[]>(this.url);
  }

  listarActivos(): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.url}?soloActivos=true`);
  }

  buscarPorId(id: string): Observable<Documento> {
    return this.http.get<Documento>(`${this.url}/${id}`);
  }

  crear(data: DocumentoRequest): Observable<Documento> {
    return this.http.post<Documento>(this.url, data);
  }

  actualizar(id: string, data: DocumentoRequest): Observable<Documento> {
    return this.http.put<Documento>(`${this.url}/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
