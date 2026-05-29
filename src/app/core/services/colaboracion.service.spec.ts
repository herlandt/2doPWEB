import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ColaboracionService } from './colaboracion.service';
import { environment } from '../../../environments/environment';

describe('ColaboracionService — endpoints', () => {
  let svc: ColaboracionService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(ColaboracionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('POST /colaboracion/diagrama/:id/invitar — invitarColaborador', () => {
    svc.invitarColaborador('dg1', 'u1', 'EDITOR').subscribe();
    const r = http.expectOne(`${api}/colaboracion/diagrama/dg1/invitar`);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ usuarioInvitadoId: 'u1', permisos: 'EDITOR' });
    r.flush({});
  });

  it('POST /colaboracion/:id/responder — responderInvitacion', () => {
    svc.responderInvitacion('c1', 'ACEPTAR').subscribe();
    const r = http.expectOne(`${api}/colaboracion/c1/responder`);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ decision: 'ACEPTAR' });
    r.flush({});
  });

  it('GET /usuarios — getUsuariosDisponibles', () => {
    svc.getUsuariosDisponibles().subscribe();
    const r = http.expectOne(`${api}/usuarios`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });
});
