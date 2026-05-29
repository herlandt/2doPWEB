import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PoliticaService } from './politica.service';
import { environment } from '../../../environments/environment';

describe('PoliticaService — endpoints', () => {
  let svc: PoliticaService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/politicas`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(PoliticaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /politicas — listar (sin filtro)', () => {
    svc.listar().subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /politicas?soloActivas=true — listar(true)', () => {
    svc.listar(true).subscribe();
    const r = http.expectOne((req) => req.url === base && req.params.get('soloActivas') === 'true');
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /politicas/:id — buscarPorId', () => {
    svc.buscarPorId('p1').subscribe();
    const r = http.expectOne(`${base}/p1`);
    expect(r.request.method).toBe('GET');
    r.flush({ id: 'p1' });
  });

  it('POST /politicas — crear', () => {
    svc.crear({ nombre: 'P' } as any).subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('POST');
    r.flush({ id: 'new' });
  });

  it('PUT /politicas/:id — actualizar', () => {
    svc.actualizar('p1', { nombre: 'Q' } as any).subscribe();
    const r = http.expectOne(`${base}/p1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 'p1' });
  });

  it('PATCH /politicas/:id/estado — cambiarEstado', () => {
    svc.cambiarEstado('p1', 'ACTIVA').subscribe();
    const r = http.expectOne(`${base}/p1/estado`);
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body).toEqual({ estado: 'ACTIVA' });
    r.flush({ id: 'p1' });
  });

  it('DELETE /politicas/:id — eliminar', () => {
    svc.eliminar('p1').subscribe();
    const r = http.expectOne(`${base}/p1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });
});
