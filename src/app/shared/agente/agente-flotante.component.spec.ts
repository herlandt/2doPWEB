import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AgenteFlotanteComponent } from './agente-flotante.component';
import { AuthService } from '../../core/services/auth.service';

class AuthServiceFake {
  isAuthenticated(): boolean { return true; }
  getRol(): string { return 'Administrador'; }
}

describe('AgenteFlotanteComponent (CU-31)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgenteFlotanteComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useClass: AuthServiceFake },
      ],
    }).compileComponents();
  });

  it('renderiza el FAB cuando el usuario está autenticado', () => {
    const fixture = TestBed.createComponent(AgenteFlotanteComponent);
    fixture.detectChanges();
    const fab = (fixture.nativeElement as HTMLElement).querySelector('.agente-fab');
    expect(fab).toBeTruthy();
  });

  it('no renderiza el panel hasta que se hace click en el FAB', () => {
    const fixture = TestBed.createComponent(AgenteFlotanteComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.agente-panel')).toBeNull();
    (root.querySelector('.agente-fab') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.agente-panel')).toBeTruthy();
  });
});
