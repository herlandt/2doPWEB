import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActividadService } from './actividad.service';
import { environment } from '../../../environments/environment';

describe('ActividadService — endpoints', () => {
  let svc: ActividadService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/actividades`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(ActividadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /actividades — listar', () => {
    svc.listar().subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /actividades?departamentoId=X — listarPorDepartamento', () => {
    svc.listarPorDepartamento('dep1').subscribe();
    const r = http.expectOne(`${base}?departamentoId=dep1`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /actividades/:id — buscarPorId', () => {
    svc.buscarPorId('abc').subscribe();
    const r = http.expectOne(`${base}/abc`);
    expect(r.request.method).toBe('GET');
    r.flush({ id: 'abc' });
  });

  it('POST /actividades — crear', () => {
    const body = { nombre: 'X', departamentoId: 'd1' } as any;
    svc.crear(body).subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(body);
    r.flush({ id: 'new' });
  });

  it('PUT /actividades/:id — actualizar', () => {
    const body = { nombre: 'Y' } as any;
    svc.actualizar('abc', body).subscribe();
    const r = http.expectOne(`${base}/abc`);
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).toEqual(body);
    r.flush({ id: 'abc' });
  });

  it('DELETE /actividades/:id — eliminar', () => {
    svc.eliminar('abc').subscribe();
    const r = http.expectOne(`${base}/abc`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });
});
