import { DatePipe, JsonPipe, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AccionAuditoria,
  ACCIONES,
  AuditoriaItem,
  PageAuditoria,
} from '../../core/models/auditoria-documento.model';
import { AuditoriaDocumentoService } from '../../core/services/auditoria-documento.service';

/**
 * CU-37 — Timeline de auditoría de un documento.
 *
 * Filtros: rango de fechas (cliente) + acción (cliente).
 * Paginación: del backend (Page<>).
 * Exportar: descarga CSV generado en el cliente con la página actual.
 */
@Component({
  selector: 'app-auditoria-documento',
  imports: [DatePipe, FormsModule, JsonPipe, KeyValuePipe, RouterLink],
  templateUrl: './auditoria-documento.component.html',
  styleUrl: './auditoria-documento.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaDocumentoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(AuditoriaDocumentoService);

  readonly documentoId = this.route.snapshot.params['id'] as string;

  readonly acciones = ACCIONES;

  readonly desde = signal('');
  readonly hasta = signal('');
  readonly filtroAccion = signal<string>('');

  readonly page = signal(0);
  readonly size = signal(50);

  readonly pagina = signal<PageAuditoria | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly itemsVisibles = computed<AuditoriaItem[]>(() => {
    const p = this.pagina();
    if (!p) return [];
    const accion = this.filtroAccion();
    if (!accion) return p.content;
    return p.content.filter((it) => it.accion === accion);
  });

  readonly hayDatos = computed(() => (this.pagina()?.totalElements ?? 0) > 0);
  readonly conteoTotal = computed(() => this.pagina()?.totalElements ?? 0);
  readonly conteoPagina = computed(() => this.pagina()?.content.length ?? 0);

  readonly conteoPorAccion = computed(() => {
    const m: Record<string, number> = {};
    for (const it of this.pagina()?.content ?? []) {
      m[it.accion] = (m[it.accion] ?? 0) + 1;
    }
    return m;
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    if (!this.documentoId) return;
    this.loading.set(true);
    this.error.set('');
    this.svc
      .listar(this.documentoId, {
        desde: this.desde() ? this.desde() + 'T00:00:00' : undefined,
        hasta: this.hasta() ? this.hasta() + 'T23:59:59' : undefined,
        page: this.page(),
        size: this.size(),
      })
      .subscribe({
        next: (p) => {
          this.pagina.set(p);
          this.loading.set(false);
        },
        error: (err: any) => {
          if (err?.status === 403) {
            this.error.set('Solo administradores pueden ver la auditoría.');
          } else {
            this.error.set('Error al cargar la auditoría.');
          }
          this.loading.set(false);
        },
      });
  }

  aplicarFiltros(): void {
    this.page.set(0);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.desde.set('');
    this.hasta.set('');
    this.filtroAccion.set('');
    this.page.set(0);
    this.cargar();
  }

  paginaAnterior(): void {
    if (this.page() > 0) {
      this.page.update((n) => n - 1);
      this.cargar();
    }
  }

  paginaSiguiente(): void {
    const p = this.pagina();
    if (p && this.page() < p.totalPages - 1) {
      this.page.update((n) => n + 1);
      this.cargar();
    }
  }

  badgeAccion(accion: string): string {
    switch (accion as AccionAuditoria) {
      case 'SUBIDA':           return 'bg-success';
      case 'NUEVA_VERSION':    return 'bg-primary';
      case 'LECTURA':          return 'bg-info text-dark';
      case 'DESCARGA':         return 'bg-secondary';
      case 'EDICION_EN_VIVO':  return 'bg-warning text-dark';
      case 'EDICION_GUARDADA': return 'bg-warning text-dark';
      case 'BLOQUEO':          return 'bg-dark';
      case 'DESBLOQUEO':       return 'bg-dark';
      case 'BORRADO':          return 'bg-danger';
      default:                 return 'bg-secondary';
    }
  }

  iconoAccion(accion: string): string {
    switch (accion as AccionAuditoria) {
      case 'SUBIDA':           return '⬆️';
      case 'NUEVA_VERSION':    return '🔄';
      case 'LECTURA':          return '👁️';
      case 'DESCARGA':         return '⬇️';
      case 'EDICION_EN_VIVO':  return '✍️';
      case 'EDICION_GUARDADA': return '💾';
      case 'BLOQUEO':          return '🔒';
      case 'DESBLOQUEO':       return '🔓';
      case 'BORRADO':          return '🗑️';
      default:                 return '•';
    }
  }

  exportarCsv(): void {
    const items = this.itemsVisibles();
    if (!items.length) return;
    const cols = ['timestamp', 'accion', 'usuarioNombre', 'usuarioId', 'rol', 'versionId', 'ip', 'userAgent'];
    const escape = (v: unknown) => {
      const s = (v == null ? '' : String(v)).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lineas = [cols.join(',')];
    for (const it of items) {
      lineas.push(cols.map((c) => escape((it as any)[c])).join(','));
    }
    const blob = new Blob([lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${this.documentoId}_p${this.page()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
