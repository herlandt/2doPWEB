import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DiagramaWorkflow,
  DiagramaRequest,
  NodoDiagrama,
  NodoRequest,
  FlujoTransicion,
  TransicionRequest,
  PromptFlowRequest,
  PromptFlowResponse,
} from '../models/diagrama.model';

@Injectable({ providedIn: 'root' })
export class DiagramaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}`;

  listarDiagramas(): Observable<DiagramaWorkflow[]> {
    return this.http.get<DiagramaWorkflow[]>(`${this.url}/diagramas`);
  }

  obtenerDiagrama(id: string): Observable<DiagramaWorkflow> {
    return this.http.get<DiagramaWorkflow>(`${this.url}/diagramas/${id}`);
  }

  crearDiagrama(data: DiagramaRequest): Observable<DiagramaWorkflow> {
    return this.http.post<DiagramaWorkflow>(`${this.url}/diagramas`, data);
  }

  actualizarDiagrama(id: string, data: DiagramaRequest): Observable<DiagramaWorkflow> {
    return this.http.put<DiagramaWorkflow>(`${this.url}/diagramas/${id}`, data);
  }

  eliminarDiagrama(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/diagramas/${id}`);
  }

  listarNodos(diagramaId: string): Observable<NodoDiagrama[]> {
    return this.http.get<NodoDiagrama[]>(`${this.url}/diagramas/${diagramaId}/nodos`);
  }

  crearNodo(diagramaId: string, data: NodoRequest): Observable<NodoDiagrama> {
    return this.http.post<NodoDiagrama>(`${this.url}/diagramas/${diagramaId}/nodos`, data);
  }

  actualizarNodo(nodoId: string, data: NodoRequest): Observable<NodoDiagrama> {
    return this.http.put<NodoDiagrama>(`${this.url}/nodos/${nodoId}`, data);
  }

  eliminarNodo(nodoId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/nodos/${nodoId}`);
  }

  listarTransiciones(diagramaId: string): Observable<FlujoTransicion[]> {
    return this.http.get<FlujoTransicion[]>(`${this.url}/diagramas/${diagramaId}/transiciones`);
  }

  crearTransicion(diagramaId: string, data: TransicionRequest): Observable<FlujoTransicion> {
    return this.http.post<FlujoTransicion>(`${this.url}/diagramas/${diagramaId}/transiciones`, data);
  }

  actualizarTransicion(transicionId: string, data: TransicionRequest): Observable<FlujoTransicion> {
    return this.http.put<FlujoTransicion>(`${this.url}/transiciones/${transicionId}`, data);
  }

  eliminarTransicion(transicionId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/transiciones/${transicionId}`);
  }

  cambiarEstado(id: string, estado: string): Observable<DiagramaWorkflow> {
    return this.http.patch<DiagramaWorkflow>(`${this.url}/diagramas/${id}/estado`, { estado });
  }

  generarConIA(data: PromptFlowRequest): Observable<PromptFlowResponse> {
    return this.http.post<PromptFlowResponse>(`${this.url}/workflow-design/from-prompt`, data);
  }
}
