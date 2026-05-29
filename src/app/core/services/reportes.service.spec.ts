import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportesService } from './reportes.service';
import { environment } from '../../../environments/environment';

describe('ReportesService — endpoints', () => {
  let svc: ReportesService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(ReportesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /tramites/historial — getHistorialTramites sin filtros (CU-29)', () => {
    svc.getHistorialTramites().subscribe();
    const r = http.expectOne((req) => req.url === `${api}/tramites/historial`);
    expect(r.request.method).toBe('GET');
    expect(r.request.params.keys().length).toBe(0);
    r.flush([]);
  });

  it('GET /tramites/historial?estado=&desde=&hasta= — getHistorialTramites con filtros', () => {
    svc.getHistorialTramites('APROBADO', '2026-01-01', '2026-12-31').subscribe();
    const r = http.expectOne((req) => req.url === `${api}/tramites/historial`);
    expect(r.request.params.get('estado')).toBe('APROBADO');
    expect(r.request.params.get('desde')).toBe('2026-01-01');
    expect(r.request.params.get('hasta')).toBe('2026-12-31');
    r.flush([]);
  });

  it('POST /reportes/generar — generarReporte (CU-26 p1)', () => {
    svc.generarReporte({ filtros: { estado: 'OK' }, formato: 'PDF' }).subscribe();
    const r = http.expectOne(`${api}/reportes/generar`);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ filtros: { estado: 'OK' }, formato: 'PDF' });
    r.flush({ id: 'r1' });
  });

  it('GET /reportes/:id/descargar — descargarReporte (Blob)', () => {
    svc.descargarReporte('r1').subscribe();
    const r = http.expectOne(`${api}/reportes/r1/descargar`);
    expect(r.request.method).toBe('GET');
    expect(r.request.responseType).toBe('blob');
    r.flush(new Blob(['x'], { type: 'application/pdf' }));
  });
});
