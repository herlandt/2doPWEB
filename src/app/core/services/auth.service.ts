import { inject, Injectable, Injector, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { Usuario } from '../models/usuario.model';
import { ColaboracionRtService } from './colaboracion-rt.service';
import { ColaboracionDocumentoRtService } from './colaboracion-documento-rt.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly _usuario = signal<LoginResponse | null>(null);
  readonly usuario = this._usuario.asReadonly();

  constructor() {
    if (!this.isBrowser) return;

    const saved = localStorage.getItem('auth');
    if (!saved) return;

    try {
      this._usuario.set(JSON.parse(saved) as LoginResponse);
    } catch {
      localStorage.removeItem('auth');
      localStorage.removeItem('token');
      this._usuario.set(null);
    }
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, req).pipe(
      tap((res) => {
        if (this.isBrowser) {
          localStorage.setItem('auth', JSON.stringify(res));
          localStorage.setItem('token', res.token);
        }
        this._usuario.set(res);
      }),
    );
  }

  logout(): void {
    // Cierra las conexiones STOMP vivas antes de borrar el token, para que
    // ninguna reconexión intente usar credenciales que ya no son válidas.
    // Se resuelven de forma perezosa para evitar la dependencia circular
    // (ambos servicios RT inyectan AuthService).
    this.injector.get(ColaboracionRtService).forzarCierre();
    this.injector.get(ColaboracionDocumentoRtService).forzarCierre();

    if (this.isBrowser) {
      localStorage.removeItem('auth');
      localStorage.removeItem('token');
    }
    this._usuario.set(null);
    this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUsuario(): LoginResponse | null {
    return this._usuario();
  }

  getUserId(): string {
    return this._usuario()?.userId ?? '';
  }

  getRol(): string {
    return this._usuario()?.rol ?? '';
  }

  isAdmin(): boolean {
    return ['Administrador', 'SuperUser'].includes(this.getRol());
  }

  isFuncionario(): boolean {
    return this.getRol() === 'Funcionario';
  }

  obtenerPerfil(): Observable<Usuario> {
    return this.http.get<Usuario>(`${environment.apiUrl}/usuarios/me`);
  }
}
