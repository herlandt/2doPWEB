import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IntegridadDocumental } from '../../core/models/integridad-documental.model';
import { ReportesService } from '../../core/services/reportes.service';
import { TrazabilidadService } from '../../core/services/trazabilidad.service';
import { mensajeAmigable } from '../../core/utils/error-messages';

@Component({
  selector: 'app-historial-tramites',
  imports: [RouterLink],
  templateUrl: './historial-tramites.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialTramitesComponent {
  private readonly reportesSvc = inject(ReportesService);
  private readonly trazabilidadSvc = inject(TrazabilidadService);

  readonly tramites = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly descargando = signal(false);

  // Filtros — backend
  readonly filtroEstado = signal('');
  readonly filtroDesde = signal('');
  readonly filtroHasta = signal('');
  readonly ordenarPor = signal('fechaInicio_desc');

  // Filtros — client-side por nombre (más amigable que buscar por ID)
  readonly filtroPolitica = signal('');
  readonly filtroCliente = signal('');

  // Integridad documental: panel expandible lazy por trámite
  readonly tramiteExpandido = signal<string | null>(null);
  readonly integridadMap = signal<Map<string, IntegridadDocumental | 'loading' | 'error'>>(new Map());

  /** Aplica filtros de nombre sobre los resultados ya cargados. */
  readonly tramitesFiltrados = computed(() => {
    const all = this.tramites();
    const pol = this.filtroPolitica().toLowerCase().trim();
    const cli = this.filtroCliente().toLowerCase().trim();
    if (!pol && !cli) return all;
    return all.filter((t) => {
      const matchPol = !pol || (t.politicaNombre ?? '').toLowerCase().includes(pol);
      const matchCli = !cli || (t.clienteNombre ?? '').toLowerCase().includes(cli);
      return matchPol && matchCli;
    });
  });

  readonly estados = [
    { valor: 'En curso',  label: 'En curso' },
    { valor: 'Observado', label: 'Observados / Devueltos' },
    { valor: 'Aprobado',  label: 'Aprobados' },
    { valor: 'Rechazado', label: 'Rechazados' },
    { valor: 'Cancelado', label: 'Cancelados' },
  ];

  readonly opcionesOrden = [
    { valor: 'fechaInicio_desc', label: 'Más recientes primero' },
    { valor: 'fechaInicio_asc',  label: 'Más antiguos primero' },
    { valor: 'estado',           label: 'Por estado' },
  ];

  constructor() {
    this.buscarHistorial();
  }

  buscarHistorial(): void {
    this.loading.set(true);
    this.error.set('');
    this.tramiteExpandido.set(null);
    this.integridadMap.set(new Map());

    this.reportesSvc
      .getHistorialTramites(
        this.filtroEstado(),
        this.filtroDesde(),
        this.filtroHasta(),
        this.ordenarPor(),
      )
      .subscribe({
        next: (data) => {
          this.tramites.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(mensajeAmigable(err));
          this.loading.set(false);
        },
      });
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('');
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.filtroPolitica.set('');
    this.filtroCliente.set('');
    this.ordenarPor.set('fechaInicio_desc');
    this.buscarHistorial();
  }

  /** Abre/cierra el panel de integridad de un trámite. Carga lazy al primer acceso. */
  toggleDetalle(tramiteId: string): void {
    if (this.tramiteExpandido() === tramiteId) {
      this.tramiteExpandido.set(null);
      return;
    }
    this.tramiteExpandido.set(tramiteId);
    this.cargarIntegridad(tramiteId);
  }

  private cargarIntegridad(tramiteId: string): void {
    if (this.integridadMap().has(tramiteId)) return;
    const m = new Map(this.integridadMap());
    m.set(tramiteId, 'loading');
    this.integridadMap.set(m);

    this.trazabilidadSvc.integridadDocumental(tramiteId).subscribe({
      next: (data) => {
        const updated = new Map(this.integridadMap());
        updated.set(tramiteId, data);
        this.integridadMap.set(updated);
      },
      error: () => {
        const updated = new Map(this.integridadMap());
        updated.set(tramiteId, 'error');
        this.integridadMap.set(updated);
      },
    });
  }

  // CU-26: generar → descargar en dos pasos
  exportar(formato: 'PDF' | 'EXCEL' | 'CSV'): void {
    if (this.tramites().length === 0) return;
    this.descargando.set(true);
    this.error.set('');

    const body = {
      filtros: {
        estado: this.filtroEstado(),
        desde: this.filtroDesde(),
        hasta: this.filtroHasta(),
      },
      formato,
    };

    this.reportesSvc.generarReporte(body).subscribe({
      next: (reporte) => {
        this.reportesSvc.descargarReporte(reporte.id).subscribe({
          next: (blob) => {
            const ext = formato === 'PDF' ? 'pdf' : formato === 'EXCEL' ? 'xlsx' : 'csv';
            this.triggerDownload(blob, `Reporte_Tramites.${ext}`);
            this.descargando.set(false);
          },
          error: (err) => {
            this.error.set(mensajeAmigable(err));
            this.descargando.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(mensajeAmigable(err));
        this.descargando.set(false);
      },
    });
  }

  setFiltroEstado(ev: Event): void {
    this.filtroEstado.set((ev.target as HTMLSelectElement).value);
  }

  setFiltroDesde(ev: Event): void {
    this.filtroDesde.set((ev.target as HTMLInputElement).value);
  }

  setFiltroHasta(ev: Event): void {
    this.filtroHasta.set((ev.target as HTMLInputElement).value);
  }

  setOrdenarPor(ev: Event): void {
    this.ordenarPor.set((ev.target as HTMLSelectElement).value);
  }

  setFiltroPolitica(ev: Event): void {
    this.filtroPolitica.set((ev.target as HTMLInputElement).value);
  }

  setFiltroCliente(ev: Event): void {
    this.filtroCliente.set((ev.target as HTMLInputElement).value);
  }

  getEstadoBadgeClass(estado: string): string {
    const mapa: Record<string, string> = {
      'En curso':  'bg-warning text-dark',
      'Observado': 'bg-warning text-dark',
      'Aprobado':  'bg-success',
      'Rechazado': 'bg-danger',
      'Cancelado': 'bg-danger',
    };
    return mapa[estado] ?? 'bg-secondary';
  }

  formatearFecha(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  formatearBytes(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
