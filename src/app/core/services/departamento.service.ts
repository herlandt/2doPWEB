import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Departamento, DepartamentoRequest } from '../models/departamento.model';

@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/departamentos`;

  listar(): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(this.url);
  }

  buscarPorId(id: string): Observable<Departamento> {
    return this.http.get<Departamento>(`${this.url}/${id}`);
  }

  crear(data: DepartamentoRequest): Observable<Departamento> {
    return this.http.post<Departamento>(this.url, data);
  }

  actualizar(id: string, data: DepartamentoRequest): Observable<Departamento> {
    return this.http.put<Departamento>(`${this.url}/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
