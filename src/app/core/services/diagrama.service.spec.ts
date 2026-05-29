import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DiagramaService } from './diagrama.service';
import { environment } from '../../../environments/environment';

describe('DiagramaService — endpoints', () => {
  let svc: DiagramaService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(DiagramaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /diagramas — listarDiagramas', () => {
    svc.listarDiagramas().subscribe();
    const r = http.expectOne(`${api}/diagramas`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /diagramas/:id — obtenerDiagrama', () => {
    svc.obtenerDiagrama('dg1').subscribe();
    const r = http.expectOne(`${api}/diagramas/dg1`);
    expect(r.request.method).toBe('GET');
    r.flush({ id: 'dg1' });
  });

  it('POST /diagramas — crearDiagrama', () => {
    svc.crearDiagrama({ nombre: 'Flujo X' } as any).subscribe();
    const r = http.expectOne(`${api}/diagramas`);
    expect(r.request.method).toBe('POST');
    r.flush({ id: 'new' });
  });

  it('PUT /diagramas/:id — actualizarDiagrama', () => {
    svc.actualizarDiagrama('dg1', { nombre: 'Y' } as any).subscribe();
    const r = http.expectOne(`${api}/diagramas/dg1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 'dg1' });
  });

  it('DELETE /diagramas/:id — eliminarDiagrama', () => {
    svc.eliminarDiagrama('dg1').subscribe();
    const r = http.expectOne(`${api}/diagramas/dg1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });

  it('GET /diagramas/:id/nodos — listarNodos', () => {
    svc.listarNodos('dg1').subscribe();
    const r = http.expectOne(`${api}/diagramas/dg1/nodos`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('POST /diagramas/:id/nodos — crearNodo', () => {
    svc.crearNodo('dg1', { tipo: 'actividad' } as any).subscribe();
    const r = http.expectOne(`${api}/diagramas/dg1/nodos`);
    expect(r.request.method).toBe('POST');
    r.flush({ id: 'n1' });
  });

  it('PUT /nodos/:id — actualizarNodo', () => {
    svc.actualizarNodo('n1', { tipo: 'decision' } as any).subscribe();
    const r = http.expectOne(`${api}/nodos/n1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 'n1' });
  });

  it('DELETE /nodos/:id — eliminarNodo', () => {
    svc.eliminarNodo('n1').subscribe();
    const r = http.expectOne(`${api}/nodos/n1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });

  it('GET /diagramas/:id/transiciones — listarTransiciones', () => {
    svc.listarTransiciones('dg1').subscribe();
    const r = http.expectOne(`${api}/diagramas/dg1/transiciones`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('POST /diagramas/:id/transiciones — crearTransicion', () => {
    svc.crearTransicion('dg1', { origenId: 'a', destinoId: 'b' } as any).subscribe();
    const r = http.expectOne(`${api}/diagramas/dg1/transiciones`);
    expect(r.request.method).toBe('POST');
    r.flush({ id: 't1' });
  });

  it('PUT /transiciones/:id — actualizarTransicion', () => {
    svc.actualizarTransicion('t1', { condicion: 'OK' } as any).subscribe();
    const r = http.expectOne(`${api}/transiciones/t1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 't1' });
  });

  it('DELETE /transiciones/:id — eliminarTransicion', () => {
    svc.eliminarTransicion('t1').subscribe();
    const r = http.expectOne(`${api}/transiciones/t1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });

  it('PATCH /diagramas/:id/estado — cambiarEstado', () => {
    svc.cambiarEstado('dg1', 'ACTIVO').subscribe();
    const r = http.expectOne(`${api}/diagramas/dg1/estado`);
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body).toEqual({ estado: 'ACTIVO' });
    r.flush({ id: 'dg1', estado: 'ACTIVO' });
  });

  it('POST /workflow-design/from-prompt — generarConIA', () => {
    svc.generarConIA({ prompt: 'crear flujo CRE' } as any).subscribe();
    const r = http.expectOne(`${api}/workflow-design/from-prompt`);
    expect(r.request.method).toBe('POST');
    r.flush({ nodos: [], transiciones: [] });
  });
});
