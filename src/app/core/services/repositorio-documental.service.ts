import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RepositorioDocumental } from '../models/repositorio-documental.model';

/**
 * CU-32 — Acceso al repositorio documental de una política.
 *
 * El repositorio se crea automáticamente al guardar la política (hook en
 * `PoliticaNegocioService` del backend). `crearReintento` solo se usa si la
 * creación automática falló (p. ej. S3 caído).
 */
@Injectable({ providedIn: 'root' })
export class RepositorioDocumentalService {
  private readonly http = inject(HttpClient);

  obtenerPorPolitica(politicaId: string): Observable<RepositorioDocumental> {
    return this.http.get<RepositorioDocumental>(
      `${environment.apiUrl}/politicas/${politicaId}/repositorio`,
    );
  }

  buscarPorId(id: string): Observable<RepositorioDocumental> {
    return this.http.get<RepositorioDocumental>(`${environment.apiUrl}/repositorios/${id}`);
  }

  /** Reintento manual cuando la creación automática falló. Solo admin. */
  crearReintento(politicaId: string): Observable<RepositorioDocumental> {
    return this.http.post<RepositorioDocumental>(
      `${environment.apiUrl}/politicas/${politicaId}/repositorio`,
      {},
    );
  }
}
