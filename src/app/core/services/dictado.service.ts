import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DictarFormularioResponse } from '../models/dictado-formulario.model';

/**
 * CU-39 — Dictado por voz de un formulario del expediente.
 *
 * El audio se envía al backend Spring (multipart); este lo pasa al
 * microservicio Python, que devuelve texto transcrito + mapeo a los
 * campos del formulario activo.
 */
@Injectable({ providedIn: 'root' })
export class DictadoService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  dictarSeccion(seccionId: string, audio: Blob): Observable<DictarFormularioResponse> {
    const fd = new FormData();
    const filename = `dictado-${Date.now()}.${this.extension(audio.type)}`;
    fd.append('audio', audio, filename);
    return this.http.post<DictarFormularioResponse>(
      `${this.api}/expedientes/secciones/${seccionId}/dictar`,
      fd,
    );
  }

  private extension(mime: string): string {
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('mp4') || mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
    return 'audio';
  }
}
