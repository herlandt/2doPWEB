import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartamentoService } from './departamento.service';
import { environment } from '../../../environments/environment';

describe('DepartamentoService — endpoints', () => {
  let svc: DepartamentoService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/departamentos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(DepartamentoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /departamentos — listar', () => {
    svc.listar().subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /departamentos/:id — buscarPorId', () => {
    svc.buscarPorId('d1').subscribe();
    const r = http.expectOne(`${base}/d1`);
    expect(r.request.method).toBe('GET');
    r.flush({ id: 'd1' });
  });

  it('POST /departamentos — crear', () => {
    const body = { nombre: 'Legal' } as any;
    svc.crear(body).subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(body);
    r.flush({ id: 'new' });
  });

  it('PUT /departamentos/:id — actualizar', () => {
    svc.actualizar('d1', { nombre: 'Z' } as any).subscribe();
    const r = http.expectOne(`${base}/d1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 'd1' });
  });

  it('DELETE /departamentos/:id — eliminar', () => {
    svc.eliminar('d1').subscribe();
    const r = http.expectOne(`${base}/d1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });
});
