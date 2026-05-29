import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TramiteC2Service {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  // CU-09: Trámites asignados al usuario autenticado (bandeja de entrada)
  // CU-44: parámetro opcional ordenarPor=ia delega al microservicio IA para
  // reordenar la bandeja por prioridad recomendada (fallback a fecha si IA cae).
  getMisPendientes(ordenarPor?: 'fecha' | 'ia'): Observable<any[]> {
    const q = ordenarPor ? `?ordenarPor=${ordenarPor}` : '';
    return this.http.get<any[]>(`${this.base}/tramites/mis-pendientes${q}`);
  }

  // CU-10: Expediente completo de un trámite
  getExpediente(tramiteId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/expedientes/tramite/${tramiteId}`);
  }

  // CU-18: Aprobar o Rechazar — body { decision, justificacion }
  decisionFinal(tramiteId: string, decision: string, justificacion: string): Observable<any> {
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/decision-final`, {
      decision,
      justificacion,
    });
  }

  // CU-17: Devolver a un nodo anterior — body { nodoDestinoId, observaciones }
  devolverTramite(tramiteId: string, nodoDestinoId: string, observaciones: string): Observable<any> {
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/devolver`, {
      nodoDestinoId,
      observaciones,
    });
  }

  // CU-11: Reasignar a otro funcionario — body { nuevoFuncionarioId, motivo }
  derivarTramite(tramiteId: string, nuevoFuncionarioId: string, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/derivar`, {
      nuevoFuncionarioId,
      motivo,
    });
  }

  // Auxiliar CU-11: lista de funcionarios (endpoint accesible con rol FUNCIONARIO)
  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/usuarios/funcionarios`);
  }

  // CU-30: Enviar audio para transcripción Speech-to-Text
  // Responde con { textoTranscrito: string, confianza: number }
  transcribirVoz(seccionId: string, audioBlob: Blob): Observable<any> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');
    return this.http.post<any>(
      `${this.base}/expedientes/secciones/${seccionId}/transcribir-voz`,
      formData,
    );
  }

  // CU-13c: Guardar borrador de los campos llenados por el funcionario en
  // una sección "en_curso". Cada item es { campoId, valor }.
  guardarBorradorSeccion(
    seccionId: string,
    campos: Array<{ campoId: string; valor: string }>,
  ): Observable<any> {
    return this.http.put<any>(`${this.base}/seccion/${seccionId}`, { campos });
  }
}
