import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('toggle alterna entre light y dark', () => {
    const svc = TestBed.inject(ThemeService);
    const m0 = svc.mode();
    svc.toggle();
    expect(svc.mode()).not.toBe(m0);
  });

  it('set fija el modo solicitado', () => {
    const svc = TestBed.inject(ThemeService);
    svc.set('dark');
    expect(svc.mode()).toBe('dark');
    svc.set('light');
    expect(svc.mode()).toBe('light');
  });
});
