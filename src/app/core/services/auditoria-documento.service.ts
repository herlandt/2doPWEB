import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageAuditoria } from '../models/auditoria-documento.model';

/**
 * CU-37 — Timeline de auditoría documental.
 *
 * Solo admin. La auditoría es inmutable (no UPDATE, no DELETE).
 * El backend devuelve una página al estilo Spring Data Page.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaDocumentoService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  listar(
    documentoId: string,
    opts: { desde?: string; hasta?: string; page?: number; size?: number } = {},
  ): Observable<PageAuditoria> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 0))
      .set('size', String(opts.size ?? 50));
    if (opts.desde) params = params.set('desde', opts.desde);
    if (opts.hasta) params = params.set('hasta', opts.hasta);

    return this.http.get<PageAuditoria>(
      `${this.api}/documentos/${documentoId}/auditoria`,
      { params },
    );
  }
}
