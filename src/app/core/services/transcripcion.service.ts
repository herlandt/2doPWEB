import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Voz → texto. Envía el audio grabado al backend (que lo transcribe vía el
 * microservicio IA) y devuelve solo el texto. Lo usan los reportes por voz
 * (CU-41): el admin dicta la consulta en lugar de escribirla.
 */
@Injectable({ providedIn: 'root' })
export class TranscripcionService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  transcribir(audio: Blob): Observable<{ textoTranscrito: string }> {
    const fd = new FormData();
    fd.append('audio', audio, 'consulta.webm');
    return this.http.post<{ textoTranscrito: string }>(
      `${this.api}/transcripcion/voz-a-texto`,
      fd,
    );
  }
}
