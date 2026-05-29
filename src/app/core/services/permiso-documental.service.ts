import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PermisoPuntoAtencion,
  PermisoPuntoAtencionRequest,
} from '../models/permiso-punto-atencion.model';

/**
 * CU-36 — Permisos por punto de atención (política × actividad).
 *
 * Si no hay permiso configurado, el backend devuelve `SOLO_LECTURA` por default
 * (regla RN-P01). Los admins siempre pueden escribir (RN-P03).
 */
@Injectable({ providedIn: 'root' })
export class PermisoDocumentalService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Upsert: crea o actualiza el permiso. */
  upsert(req: PermisoPuntoAtencionRequest): Observable<PermisoPuntoAtencion> {
    return this.http.put<PermisoPuntoAtencion>(
      `${this.api}/actividades/${req.actividadId}/permiso-documental`,
      req,
    );
  }

  /** Lista los permisos configurados para una política. */
  listarPorPolitica(politicaId: string): Observable<PermisoPuntoAtencion[]> {
    return this.http.get<PermisoPuntoAtencion[]>(
      `${this.api}/politicas/${politicaId}/permisos-documentales`,
    );
  }

  /** Obtiene el permiso de (política, actividad). Devuelve SOLO_LECTURA si no hay. */
  obtener(politicaId: string, actividadId: string): Observable<PermisoPuntoAtencion> {
    return this.http.get<PermisoPuntoAtencion>(
      `${this.api}/politicas/${politicaId}/actividades/${actividadId}/permiso-documental`,
    );
  }
}
