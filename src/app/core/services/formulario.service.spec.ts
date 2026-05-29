import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormularioService } from './formulario.service';
import { environment } from '../../../environments/environment';

describe('FormularioService — endpoints', () => {
  let svc: FormularioService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(FormularioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /nodos/:id/formulario — obtenerPorNodo', () => {
    svc.obtenerPorNodo('n1').subscribe();
    const r = http.expectOne(`${api}/nodos/n1/formulario`);
    expect(r.request.method).toBe('GET');
    r.flush({ id: 'f1' });
  });

  it('POST /nodos/:id/formulario — crearParaNodo', () => {
    svc.crearParaNodo('n1', { titulo: 'F' } as any).subscribe();
    const r = http.expectOne(`${api}/nodos/n1/formulario`);
    expect(r.request.method).toBe('POST');
    r.flush({ id: 'f1' });
  });

  it('PUT /formularios-plantilla/:id — actualizar', () => {
    svc.actualizar('f1', { titulo: 'X' } as any).subscribe();
    const r = http.expectOne(`${api}/formularios-plantilla/f1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 'f1' });
  });

  it('DELETE /formularios-plantilla/:id — eliminar', () => {
    svc.eliminar('f1').subscribe();
    const r = http.expectOne(`${api}/formularios-plantilla/f1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });

  it('GET /formularios-plantilla/:id/campos — listarCampos', () => {
    svc.listarCampos('f1').subscribe();
    const r = http.expectOne(`${api}/formularios-plantilla/f1/campos`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('POST /formularios-plantilla/:id/campos — agregarCampo', () => {
    svc.agregarCampo('f1', { etiqueta: 'CI' } as any).subscribe();
    const r = http.expectOne(`${api}/formularios-plantilla/f1/campos`);
    expect(r.request.method).toBe('POST');
    r.flush({ id: 'c1' });
  });

  it('PUT /campos-plantilla/:id — actualizarCampo', () => {
    svc.actualizarCampo('c1', { etiqueta: 'X' } as any).subscribe();
    const r = http.expectOne(`${api}/campos-plantilla/c1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 'c1' });
  });

  it('DELETE /campos-plantilla/:id — eliminarCampo', () => {
    svc.eliminarCampo('c1').subscribe();
    const r = http.expectOne(`${api}/campos-plantilla/c1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });

  it('PATCH /formularios-plantilla/:id/campos/reordenar — reordenarCampos', () => {
    svc.reordenarCampos('f1', ['c1', 'c2']).subscribe();
    const r = http.expectOne(`${api}/formularios-plantilla/f1/campos/reordenar`);
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body).toEqual(['c1', 'c2']);
    r.flush([]);
  });
});
