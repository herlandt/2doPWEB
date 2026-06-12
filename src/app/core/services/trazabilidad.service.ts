import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IntegridadDocumental } from '../models/integridad-documental.model';

@Injectable({ providedIn: 'root' })
export class TrazabilidadService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  integridadDocumental(tramiteId: string): Observable<IntegridadDocumental> {
    return this.http.get<IntegridadDocumental>(
      `${this.base}/trazabilidad/${tramiteId}/integridad-documental`,
    );
  }
}
