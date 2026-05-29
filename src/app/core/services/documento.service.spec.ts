import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DocumentoService } from './documento.service';
import { environment } from '../../../environments/environment';

describe('DocumentoService — endpoints', () => {
  let svc: DocumentoService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/documentos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(DocumentoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /documentos — listar', () => {
    svc.listar().subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /documentos?soloActivos=true — listarActivos', () => {
    svc.listarActivos().subscribe();
    const r = http.expectOne(`${base}?soloActivos=true`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /documentos/:id — buscarPorId', () => {
    svc.buscarPorId('d1').subscribe();
    const r = http.expectOne(`${base}/d1`);
    expect(r.request.method).toBe('GET');
    r.flush({ id: 'd1' });
  });

  it('POST /documentos — crear', () => {
    svc.crear({ nombre: 'CI' } as any).subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('POST');
    r.flush({ id: 'new' });
  });

  it('PUT /documentos/:id — actualizar', () => {
    svc.actualizar('d1', { nombre: 'X' } as any).subscribe();
    const r = http.expectOne(`${base}/d1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 'd1' });
  });

  it('DELETE /documentos/:id — eliminar', () => {
    svc.eliminar('d1').subscribe();
    const r = http.expectOne(`${base}/d1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });
});
