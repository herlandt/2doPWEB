import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TramiteC2Service } from './tramite-c2.service';
import { environment } from '../../../environments/environment';

describe('TramiteC2Service — endpoints', () => {
  let svc: TramiteC2Service;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(TramiteC2Service);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /tramites/mis-pendientes — getMisPendientes (CU-09)', () => {
    svc.getMisPendientes().subscribe();
    const r = http.expectOne(`${api}/tramites/mis-pendientes`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /expedientes/tramite/:id — getExpediente (CU-10)', () => {
    svc.getExpediente('t1').subscribe();
    const r = http.expectOne(`${api}/expedientes/tramite/t1`);
    expect(r.request.method).toBe('GET');
    r.flush({});
  });

  it('POST /tramites/:id/decision-final — decisionFinal (CU-18)', () => {
    svc.decisionFinal('t1', 'APROBAR', 'OK').subscribe();
    const r = http.expectOne(`${api}/tramites/t1/decision-final`);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ decision: 'APROBAR', justificacion: 'OK' });
    r.flush({});
  });

  it('POST /tramites/:id/devolver — devolverTramite (CU-17)', () => {
    svc.devolverTramite('t1', 'n1', 'falta dato').subscribe();
    const r = http.expectOne(`${api}/tramites/t1/devolver`);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ nodoDestinoId: 'n1', observaciones: 'falta dato' });
    r.flush({});
  });

  it('POST /tramites/:id/reasignar — reasignarTramite (CU-11)', () => {
    svc.reasignarTramite('t1', 'f2', 'reasignación').subscribe();
    const r = http.expectOne(`${api}/tramites/t1/reasignar`);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ nuevoFuncionarioId: 'f2', motivo: 'reasignación' });
    r.flush({});
  });

  it('POST /tramites/:id/aceptar — aceptarTramite', () => {
    svc.aceptarTramite('t1').subscribe();
    const r = http.expectOne(`${api}/tramites/t1/aceptar`);
    expect(r.request.method).toBe('POST');
    r.flush({});
  });

  it('GET /usuarios/funcionarios — getUsuarios', () => {
    svc.getUsuarios().subscribe();
    const r = http.expectOne(`${api}/usuarios/funcionarios`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('POST /expedientes/secciones/:id/transcribir-voz — transcribirVoz (CU-30, multipart)', () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    svc.transcribirVoz('s1', blob).subscribe();
    const r = http.expectOne(`${api}/expedientes/secciones/s1/transcribir-voz`);
    expect(r.request.method).toBe('POST');
    expect(r.request.body instanceof FormData).toBe(true);
    r.flush({ textoTranscrito: 'hola', confianza: 0.9 });
  });
});
