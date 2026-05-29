import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MetricasService } from './metricas.service';
import { environment } from '../../../environments/environment';

describe('MetricasService — endpoints', () => {
  let svc: MetricasService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(MetricasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /metricas/tramite/:id — getMetricasTramite (CU-24)', () => {
    svc.getMetricasTramite('t1').subscribe();
    const r = http.expectOne(`${api}/metricas/tramite/t1`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /metricas/cuellos-botella — getCuellosDeBotella (CU-25)', () => {
    svc.getCuellosDeBotella().subscribe();
    const r = http.expectOne(`${api}/metricas/cuellos-botella`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });
});
