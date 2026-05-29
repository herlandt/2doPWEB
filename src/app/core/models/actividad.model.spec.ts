import { SALIDAS_INFO, SalidaActividad } from './actividad.model';

describe('Actividad model — catálogo de salidas posibles', () => {
  it('expone exactamente las 5 salidas válidas reconocidas por el backend', () => {
    const valores = SALIDAS_INFO.map((s) => s.value).sort();
    expect(valores).toEqual(
      (['aprobar', 'completar', 'derivar', 'observar', 'rechazar'] as SalidaActividad[]).sort(),
    );
  });

  it('cada salida tiene label, descripción, icono y color no vacíos', () => {
    for (const s of SALIDAS_INFO) {
      expect(s.label.trim().length).toBeGreaterThan(0);
      expect(s.descripcion.trim().length).toBeGreaterThan(0);
      expect(s.icono.trim().length).toBeGreaterThan(0);
      expect(['success', 'danger', 'info', 'warning', 'secondary']).toContain(s.color);
    }
  });

  it('los valores son únicos (sin duplicados accidentales en el catálogo)', () => {
    const valores = SALIDAS_INFO.map((s) => s.value);
    expect(new Set(valores).size).toBe(valores.length);
  });
});
