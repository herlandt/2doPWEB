import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ColaboracionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  // CU-15: Invitar colaborador — body { usuarioInvitadoId, permisos }
  invitarColaborador(diagramaId: string, usuarioInvitadoId: string, permisos: string): Observable<any> {
    return this.http.post<any>(`${this.base}/colaboracion/diagrama/${diagramaId}/invitar`, {
      usuarioInvitadoId,
      permisos,
    });
  }

  // CU-15: Responder invitación — body { decision: "ACEPTAR" | "RECHAZAR" }
  responderInvitacion(colaboracionId: string, decision: 'ACEPTAR' | 'RECHAZAR'): Observable<any> {
    return this.http.post<any>(`${this.base}/colaboracion/${colaboracionId}/responder`, {
      decision,
    });
  }

  // Listar usuarios disponibles para invitar (reutiliza /api/usuarios)
  getUsuariosDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/usuarios`);
  }
}
