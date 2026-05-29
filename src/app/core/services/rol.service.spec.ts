import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RolService } from './rol.service';
import { environment } from '../../../environments/environment';

describe('RolService — endpoints', () => {
  let svc: RolService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(RolService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /roles — listar', () => {
    svc.listar().subscribe();
    const r = http.expectOne(`${environment.apiUrl}/roles`);
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });
});
