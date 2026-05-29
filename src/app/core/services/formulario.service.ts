import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CampoPlantilla,
  CampoPlantillaRequest,
  FormularioPlantilla,
  FormularioPlantillaRequest,
} from '../models/formulario.model';

@Injectable({ providedIn: 'root' })
export class FormularioService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  obtenerPorNodo(nodoId: string): Observable<FormularioPlantilla> {
    return this.http.get<FormularioPlantilla>(`${this.url}/nodos/${nodoId}/formulario`);
  }

  crearParaNodo(nodoId: string, data: FormularioPlantillaRequest): Observable<FormularioPlantilla> {
    return this.http.post<FormularioPlantilla>(`${this.url}/nodos/${nodoId}/formulario`, data);
  }

  actualizar(formularioId: string, data: FormularioPlantillaRequest): Observable<FormularioPlantilla> {
    return this.http.put<FormularioPlantilla>(`${this.url}/formularios-plantilla/${formularioId}`, data);
  }

  eliminar(formularioId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/formularios-plantilla/${formularioId}`);
  }

  listarCampos(formularioId: string): Observable<CampoPlantilla[]> {
    return this.http.get<CampoPlantilla[]>(`${this.url}/formularios-plantilla/${formularioId}/campos`);
  }

  agregarCampo(formularioId: string, data: CampoPlantillaRequest): Observable<CampoPlantilla> {
    return this.http.post<CampoPlantilla>(`${this.url}/formularios-plantilla/${formularioId}/campos`, data);
  }

  actualizarCampo(campoId: string, data: CampoPlantillaRequest): Observable<CampoPlantilla> {
    return this.http.put<CampoPlantilla>(`${this.url}/campos-plantilla/${campoId}`, data);
  }

  eliminarCampo(campoId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/campos-plantilla/${campoId}`);
  }

  reordenarCampos(formularioId: string, idsEnOrden: string[]): Observable<CampoPlantilla[]> {
    return this.http.patch<CampoPlantilla[]>(
      `${this.url}/formularios-plantilla/${formularioId}/campos/reordenar`,
      idsEnOrden,
    );
  }
}
