import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DocumentoArchivo,
  DocumentoArchivoResponse,
  PreviewDocumento,
  SubirDocumentoRequest,
} from '../models/documento-archivo.model';
import { VersionDocumento } from '../models/version-documento.model';

/**
 * CU-33/34/35 — Subir, previsualizar y versionar documentos del expediente del trámite.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoArchivoService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  // ── CU-33 · Subir ───────────────────────────────────────────────────────

  /**
   * Subida multipart al trámite (el backend resuelve/crea el repositorio 1:1).
   * Para detectar 409 (hash duplicado), 413 (>100MB) o 503 (S3 caído),
   * el caller debe inspeccionar `error.status`.
   */
  subir(
    tramiteId: string,
    archivo: File,
    req: SubirDocumentoRequest,
  ): Observable<DocumentoArchivoResponse> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    // En PARALELO no hay actividad única; se manda solo el nodoId y el backend
    // resuelve la actividad. (Antes se mandaba el string "undefined".)
    if (req.actividadId) fd.append('actividadId', req.actividadId);
    if (req.nodoId) fd.append('nodoId', req.nodoId);
    fd.append('tipoDocumento', req.tipoDocumento);
    fd.append('nombreLogico', req.nombreLogico);
    fd.append('obligatorio', String(req.obligatorio ?? false));

    return this.http.post<DocumentoArchivoResponse>(
      `${this.api}/tramites/${tramiteId}/documentos`,
      fd,
    );
  }

  // ── Listados ─────────────────────────────────────────────────────────────

  listarPorTramite(tramiteId: string, actividadId?: string): Observable<DocumentoArchivo[]> {
    const url = actividadId
      ? `${this.api}/tramites/${tramiteId}/documentos?actividadId=${actividadId}`
      : `${this.api}/tramites/${tramiteId}/documentos`;
    return this.http.get<DocumentoArchivo[]>(url);
  }

  // ── CU-34 · Preview ──────────────────────────────────────────────────────

  preview(documentoId: string): Observable<PreviewDocumento> {
    return this.http.get<PreviewDocumento>(`${this.api}/documentos/${documentoId}/preview`);
  }

  // ── CU-35 · Versionado ───────────────────────────────────────────────────

  listarVersiones(documentoId: string): Observable<VersionDocumento[]> {
    return this.http.get<VersionDocumento[]>(`${this.api}/documentos/${documentoId}/versiones`);
  }

  // ── Edición colaborativa Office (OnlyOffice) ─────────────────────────────

  /** Config firmada del editor OnlyOffice para co-editar un .docx/.xlsx/.pptx. */
  onlyofficeConfig(documentoId: string): Observable<{ serverUrl: string; config: unknown }> {
    return this.http.get<{ serverUrl: string; config: unknown }>(
      `${this.api}/documentos/${documentoId}/onlyoffice/config`,
    );
  }

  nuevaVersion(
    documentoId: string,
    archivo: File,
    comentarioCambio?: string,
  ): Observable<DocumentoArchivoResponse> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    if (comentarioCambio) fd.append('comentarioCambio', comentarioCambio);
    return this.http.post<DocumentoArchivoResponse>(
      `${this.api}/documentos/${documentoId}/versiones`,
      fd,
    );
  }
}
