import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AgenteService } from './agente.service';
import { environment } from '../../../environments/environment';

describe('AgenteService (CU-31)', () => {
  let svc: AgenteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(AgenteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POSTea al endpoint /api/agente/consultar con el contrato esperado', () => {
    const payload = { consulta: 'Hola', moduloActivo: '/admin/diagramas', tramiteIdOpcional: null };
    let result: any = null;
    svc.consultar(payload).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/agente/consultar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({
      idLogBaseDatos: 'abc123',
      respuesta: 'Estás en diseño de flujos.',
      accion: { label: 'Abrir editor', ruta: '/admin/diagramas', tipo: 'navegar' },
      fuente: 'kb-local',
    });

    expect(result.respuesta).toContain('diseño');
    expect(result.accion.ruta).toBe('/admin/diagramas');
    expect(result.fuente).toBe('kb-local');
  });
});
