import { SALIDAS_INFO, SalidaActividad } from './actividad.model';

describe('Actividad model — catálogo de salidas posibles', () => {
  it('expone exactamente las 4 salidas que se ofrecen al crear actividades', () => {
    const valores = SALIDAS_INFO.map((s) => s.value).sort();
    expect(valores).toEqual(
      (['aprobar', 'completar', 'observar', 'rechazar'] as SalidaActividad[]).sort(),
    );
  });

  it('el valor legacy "derivar" sigue siendo un SalidaActividad válido pero ya no se ofrece', () => {
    const legacy: SalidaActividad = 'derivar';
    expect(SALIDAS_INFO.some((s) => s.value === legacy)).toBe(false);
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
