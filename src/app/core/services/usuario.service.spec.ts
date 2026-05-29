import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsuarioService } from './usuario.service';
import { environment } from '../../../environments/environment';

describe('UsuarioService — endpoints', () => {
  let svc: UsuarioService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/usuarios`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(UsuarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /usuarios — listar', () => {
    svc.listar().subscribe();
    const r = http.expectOne(base);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('GET /usuarios/:id — buscarPorId', () => {
    svc.buscarPorId('u1').subscribe();
    const r = http.expectOne(`${base}/u1`);
    expect(r.request.method).toBe('GET');
    r.flush({ id: 'u1' });
  });

  it('POST /usuarios/crear — crear', () => {
    svc.crear({ email: 'a@x.com' } as any).subscribe();
    const r = http.expectOne(`${base}/crear`);
    expect(r.request.method).toBe('POST');
    r.flush({ id: 'new' });
  });

  it('PUT /usuarios/:id — actualizar', () => {
    svc.actualizar('u1', { nombre: 'Z' } as any).subscribe();
    const r = http.expectOne(`${base}/u1`);
    expect(r.request.method).toBe('PUT');
    r.flush({ id: 'u1' });
  });

  it('DELETE /usuarios/:id — eliminar', () => {
    svc.eliminar('u1').subscribe();
    const r = http.expectOne(`${base}/u1`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });

  it('PUT /usuarios/:id — toggleActivo (envía { activo })', () => {
    svc.toggleActivo('u1', false).subscribe();
    const r = http.expectOne(`${base}/u1`);
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).toEqual({ activo: false });
    r.flush({ id: 'u1', activo: false });
  });
});
