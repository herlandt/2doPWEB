import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

@Component({ standalone: true, template: '' })
class StubComponent {}
import { environment } from '../../../environments/environment';

describe('AuthService — endpoints', () => {
  let svc: AuthService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: StubComponent }]),
      ],
    });
    svc = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('POST /auth/login — login y persiste token', () => {
    let out: any = null;
    svc.login({ email: 'a@x.com', password: 'p' } as any).subscribe((r) => (out = r));
    const r = http.expectOne(`${api}/auth/login`);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ email: 'a@x.com', password: 'p' });
    r.flush({ token: 'TKN', rol: 'Administrador' });
    expect(out.token).toBe('TKN');
    expect(svc.getToken()).toBe('TKN');
    expect(svc.isAuthenticated()).toBe(true);
  });

  it('GET /usuarios/me — obtenerPerfil', () => {
    svc.obtenerPerfil().subscribe();
    const r = http.expectOne(`${api}/usuarios/me`);
    expect(r.request.method).toBe('GET');
    r.flush({ id: 'u1' });
  });

  it('logout limpia token e isAuthenticated', () => {
    localStorage.setItem('token', 'X');
    expect(svc.isAuthenticated()).toBe(true);
    svc.logout();
    expect(svc.getToken()).toBeNull();
  });
});
