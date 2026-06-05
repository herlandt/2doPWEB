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

  // Estado enriquecido del trámite (incluye documentoResolucionId, progreso, etc.)
  getEstado(tramiteId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tramites/${tramiteId}/estado`);
  }

  // Completar el nodo actual y avanzar. Cuando el siguiente nodo es un 'decision'
  // (if), `decision` lleva la rama elegida por el funcionario ('si' | 'no') y el
  // motor enruta por la transición con esa etiqueta.
  completarNodo(tramiteId: string, decision?: string, notas?: string): Observable<any> {
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/completar-nodo`, {
      decision,
      notas,
    });
  }

  // Aceptar (recepcionar) el trámite: Pendiente de recepción → En ejecución.
  aceptarTramite(tramiteId: string): Observable<any> {
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/aceptar`, {});
  }

  // CU-18: Aprobar o Rechazar — body JSON { decision, justificacion }.
  decisionFinal(tramiteId: string, decision: string, justificacion: string): Observable<any> {
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/decision-final`, {
      decision,
      justificacion,
    });
  }

  // CU-18 (Aprobar con documento de resolución entregable) — multipart.
  decisionFinalConResolucion(
    tramiteId: string,
    decision: string,
    justificacion: string,
    archivo: File,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('decision', decision);
    formData.append('justificacion', justificacion ?? '');
    formData.append('archivo', archivo, archivo.name);
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/decision-final`, formData);
  }

  // Descargar el documento de resolución del trámite (URL firmada).
  descargarResolucion(tramiteId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/tramites/${tramiteId}/resolucion`);
  }

  // CU-17: Observar/Devolver a un nodo anterior — body { nodoDestinoId, observaciones,
  // documentosObservados }. `documentosObservados` son los ids de DocumentoArchivo que
  // el funcionario marcó como erróneos; el cliente solo verá esos para corregir.
  devolverTramite(
    tramiteId: string,
    nodoDestinoId: string,
    observaciones: string,
    documentosObservados: string[] = [],
  ): Observable<any> {
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/devolver`, {
      nodoDestinoId,
      observaciones,
      documentosObservados,
    });
  }

  // CU-11: Reasignar a otro funcionario del mismo nodo — body { nuevoFuncionarioId, motivo }
  reasignarTramite(tramiteId: string, nuevoFuncionarioId: string, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.base}/tramites/${tramiteId}/reasignar`, {
      nuevoFuncionarioId,
      motivo,
    });
  }

  /** @deprecated Usa {@link reasignarTramite}. Mantenido por compatibilidad. */
  derivarTramite(tramiteId: string, nuevoFuncionarioId: string, motivo: string): Observable<any> {
    return this.reasignarTramite(tramiteId, nuevoFuncionarioId, motivo);
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
