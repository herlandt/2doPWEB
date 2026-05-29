import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentoArchivoService } from '../../core/services/documento-archivo.service';
import { TramiteC2Service } from '../../core/services/tramite-c2.service';
import { DocumentoArchivo } from '../../core/models/documento-archivo.model';
import { DictarSeccionComponent } from '../../shared/dictar-seccion/dictar-seccion.component';
import { DictarFormularioResponse } from '../../core/models/dictado-formulario.model';

@Component({
  selector: 'app-expediente-digital',
  imports: [RouterLink, DatePipe, DictarSeccionComponent],
  templateUrl: './expediente-digital.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpedienteDigitalComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tramiteC2Svc = inject(TramiteC2Service);
  private readonly authSvc = inject(AuthService);
  private readonly docSvc = inject(DocumentoArchivoService);

  readonly volverUrl = computed(() =>
    this.authSvc.isAdmin() ? '/admin/historial' : '/funcionario/bandeja',
  );

  readonly mostrarAcciones = computed(() => !this.authSvc.isAdmin());

  readonly tramiteId = this.route.snapshot.params['id'] as string;

  // CU-10
  readonly expediente = signal<any>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  // CU-16 / CU-18 / CU-17 / CU-11 — panel de decisiones
  readonly justificacion = signal('');
  readonly accionSeleccionada = signal('');
  readonly procesando = signal(false);

  // CU-17
  readonly nodoDestinoId = signal('');
  readonly seccionesAnteriores = signal<any[]>([]);

  // CU-11
  readonly funcionarioDestinoId = signal('');
  readonly listaFuncionarios = signal<any[]>([]);

  // CU-30: el dictado por voz se canaliza a través de <app-dictar-seccion>
  // dentro de cada sección activa. El botón micrófono duplicado que vivía
  // en este componente se removió para evitar dos puntos de entrada.

  // CU-34 — documentos del repositorio asociados al trámite
  readonly documentos = signal<DocumentoArchivo[]>([]);
  readonly cargandoDocumentos = signal(false);
  readonly errorDocumentos = signal('');
  readonly previewCargandoId = signal<string | null>(null);

  // CU-13c — valores en edición por campoId (no persiste hasta "Guardar borrador").
  readonly valoresEnEdicion = signal<Record<string, string>>({});
  readonly guardandoSeccionId = signal<string | null>(null);
  readonly guardadoOkSeccionId = signal<string | null>(null);

  constructor() {
    this.cargarExpediente();
    this.cargarDocumentos();
  }

  // ── CU-13c: llenado del formulario de la sección activa ───────────────

  setCampoValor(campoId: string, ev: Event): void {
    const target = ev.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    this.valoresEnEdicion.update((curr) => ({ ...curr, [campoId]: target.value }));
  }

  setCampoCheck(campoId: string, ev: Event): void {
    const target = ev.target as HTMLInputElement;
    this.valoresEnEdicion.update((curr) => ({ ...curr, [campoId]: target.checked ? 'true' : 'false' }));
  }

  guardarBorradorSeccion(seccion: any): void {
    const seccionId = seccion?.infoSeccion?.id;
    if (!seccionId) return;

    const editados = this.valoresEnEdicion();
    const campos = (seccion.campos ?? [])
      .map((c: any) => ({
        campoId: c.id,
        // Si el usuario tocó el campo usamos lo editado; si no, dejamos el valor que ya venía.
        valor: editados[c.id] !== undefined ? editados[c.id] : (c.valor ?? ''),
      }))
      .filter((c: any) => c.campoId);

    this.guardandoSeccionId.set(seccionId);
    this.guardadoOkSeccionId.set(null);
    this.tramiteC2Svc.guardarBorradorSeccion(seccionId, campos).subscribe({
      next: () => {
        this.guardandoSeccionId.set(null);
        this.guardadoOkSeccionId.set(seccionId);
        // Refrescamos para que los valores del servidor se reflejen en pantalla.
        this.cargarExpediente();
        setTimeout(() => this.guardadoOkSeccionId.set(null), 3000);
      },
      error: (err: any) => {
        this.guardandoSeccionId.set(null);
        const msg = err?.error?.message ?? err?.error?.detail ?? 'No se pudo guardar el borrador';
        this.error.set(msg);
      },
    });
  }

  private cargarDocumentos(): void {
    if (!this.tramiteId) return;
    this.cargandoDocumentos.set(true);
    this.errorDocumentos.set('');
    this.docSvc.listarPorTramite(this.tramiteId).subscribe({
      next: (docs) => {
        this.documentos.set(docs);
        this.cargandoDocumentos.set(false);
      },
      error: (err: any) => {
        this.cargandoDocumentos.set(false);
        if (err?.status === 403) {
          this.errorDocumentos.set('Sin permiso de lectura para los documentos de este trámite.');
        } else if (err?.status !== 404) {
          this.errorDocumentos.set('No se pudieron cargar los documentos.');
        }
        // 404 = repositorio aún no creado → lista vacía sin mensaje.
      },
    });
  }

  /** Pide la URL S3 firmada y la abre en una pestaña nueva. */
  verDocumento(doc: DocumentoArchivo): void {
    if (this.previewCargandoId() === doc.id) return;
    this.previewCargandoId.set(doc.id);
    this.docSvc.preview(doc.id).subscribe({
      next: (p) => {
        this.previewCargandoId.set(null);
        if (p?.urlPreview) {
          window.open(p.urlPreview, '_blank', 'noopener');
        }
      },
      error: () => {
        this.previewCargandoId.set(null);
        this.errorDocumentos.set('No se pudo generar la vista previa.');
        setTimeout(() => this.errorDocumentos.set(''), 4000);
      },
    });
  }

  iconoTipoDoc(tipo: string): string {
    switch ((tipo || '').toUpperCase()) {
      case 'PDF':    return '📕';
      case 'IMAGEN': return '🖼️';
      case 'WORD':   return '📝';
      case 'EXCEL':  return '📊';
      case 'AUDIO':  return '🎵';
      case 'VIDEO':  return '🎬';
      default:       return '📄';
    }
  }

  cargarExpediente(): void {
    if (!this.tramiteId) return;
    this.loading.set(true);
    this.error.set('');

    this.tramiteC2Svc.getExpediente(this.tramiteId).subscribe({
      next: (data) => {
        this.expediente.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el expediente.');
        this.loading.set(false);
      },
    });
  }

  // CU-17: carga secciones completadas para selector de retroceso
  prepararDevolucion(): void {
    this.accionSeleccionada.set('DEVOLVER');
    this.nodoDestinoId.set('');

    if (this.seccionesAnteriores().length === 0) {
      const exp = this.expediente();
      const completadas = (exp?.secciones ?? []).filter(
        (s: any) => s.infoSeccion?.estado === 'completada',
      );
      this.seccionesAnteriores.set(completadas);
    }
  }

  // CU-11: carga funcionarios disponibles
  prepararDerivacion(): void {
    this.accionSeleccionada.set('DERIVAR');
    this.funcionarioDestinoId.set('');

    if (this.listaFuncionarios().length === 0) {
      this.tramiteC2Svc.getUsuarios().subscribe({
        next: (data) => {
          this.listaFuncionarios.set(data);
        },
        error: () => this.error.set('No se pudo cargar la lista de funcionarios.'),
      });
    }
  }

  // Llama el endpoint correcto según la acción elegida
  ejecutarAccion(tipo: string): void {
    if (!confirm(`¿Está seguro de proceder con: ${tipo}?`)) return;

    this.procesando.set(true);
    this.error.set('');

    if (tipo === 'APROBAR') {
      this.tramiteC2Svc.decisionFinal(this.tramiteId, 'Aprobar', this.justificacion()).subscribe({
        next: () => this.finalizarExitosamente('Trámite aprobado. Ha avanzado al siguiente departamento.'),
        error: (err) => this.manejarError(err),
      });
    } else if (tipo === 'RECHAZAR') {
      this.tramiteC2Svc.decisionFinal(this.tramiteId, 'Rechazar', this.justificacion()).subscribe({
        next: () => this.finalizarExitosamente('Trámite rechazado y cerrado.'),
        error: (err) => this.manejarError(err),
      });
    } else if (tipo === 'DEVOLVER') {
      this.tramiteC2Svc
        .devolverTramite(this.tramiteId, this.nodoDestinoId(), this.justificacion())
        .subscribe({
          next: () => this.finalizarExitosamente('Trámite devuelto para corrección.'),
          error: (err) => this.manejarError(err),
        });
    } else if (tipo === 'DERIVAR') {
      this.tramiteC2Svc
        .derivarTramite(this.tramiteId, this.funcionarioDestinoId(), this.justificacion())
        .subscribe({
          next: () => this.finalizarExitosamente('Trámite reasignado al compañero.'),
          error: (err) => this.manejarError(err),
        });
    }
  }

  setJustificacion(ev: Event): void {
    this.justificacion.set((ev.target as HTMLTextAreaElement).value);
  }

  setNodoDestino(ev: Event): void {
    this.nodoDestinoId.set((ev.target as HTMLSelectElement).value);
  }

  setFuncionarioDestino(ev: Event): void {
    this.funcionarioDestinoId.set((ev.target as HTMLSelectElement).value);
  }

  private finalizarExitosamente(mensaje: string): void {
    this.procesando.set(false);
    alert(mensaje);
    this.router.navigate([this.volverUrl()]);
  }

  private manejarError(err: any): void {
    this.procesando.set(false);
    const msg =
      err?.error?.message ?? err?.error?.detail ?? err?.message ?? 'Error desconocido';
    this.error.set(`Error al procesar la acción: ${msg}`);
  }

  formatearFecha(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-BO');
    } catch {
      return iso;
    }
  }

  // CU-39 · dictado por voz aplicado a una sección
  onDictadoAplicado(resp: DictarFormularioResponse): void {
    const aplicados = resp.campos.filter((c) => c.valor).length;
    this.exito.set(
      aplicados > 0
        ? `${aplicados} campo(s) sugeridos por IA listos. Revisa y guarda manualmente.`
        : 'Dictado registrado. No se mapeó ningún campo automáticamente.',
    );
    setTimeout(() => this.exito.set(''), 5000);
  }
}
