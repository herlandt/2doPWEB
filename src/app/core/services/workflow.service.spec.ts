import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowService } from './workflow.service';
import { environment } from '../../../environments/environment';

describe('WorkflowService — endpoints', () => {
  let svc: WorkflowService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/tramites`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(WorkflowService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /tramites/mis-pendientes — listarTramites', () => {
    svc.listarTramites().subscribe();
    const r = http.expectOne(`${base}/mis-pendientes`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /tramites/:id/estado — obtenerEstado', () => {
    svc.obtenerEstado('t1').subscribe();
    const r = http.expectOne(`${base}/t1/estado`);
    expect(r.request.method).toBe('GET');
    r.flush({});
  });

  it('POST /tramites/:id/completar-nodo — completarNodo', () => {
    svc.completarNodo('t1', { datos: {} } as any).subscribe();
    const r = http.expectOne(`${base}/t1/completar-nodo`);
    expect(r.request.method).toBe('POST');
    r.flush({});
  });

  it('GET /tramites/:id/historial — obtenerHistorial', () => {
    svc.obtenerHistorial('t1').subscribe();
    const r = http.expectOne(`${base}/t1/historial`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });
});
