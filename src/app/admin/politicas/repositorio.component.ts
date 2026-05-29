import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import {
  DocumentoArchivo,
  PreviewDocumento,
  SubirDocumentoRequest,
  TIPOS_DOCUMENTO,
  TipoDocumento,
} from '../../core/models/documento-archivo.model';
import { Politica } from '../../core/models/politica.model';
import { RepositorioDocumental } from '../../core/models/repositorio-documental.model';
import { VersionDocumento } from '../../core/models/version-documento.model';
import { DocumentoArchivoService } from '../../core/services/documento-archivo.service';
import { PoliticaService } from '../../core/services/politica.service';
import { RepositorioDocumentalService } from '../../core/services/repositorio-documental.service';

/**
 * CU-32 / CU-33 / CU-34 / CU-35 — Repositorio documental de una política.
 *
 * Permite al administrador:
 *  - ver el repositorio (auto-creado al guardar la política);
 *  - subir documentos nuevos al repositorio (modal);
 *  - expandir un documento para ver preview inline + historial de versiones;
 *  - crear una nueva versión de un documento existente.
 */
@Component({
  selector: 'app-repositorio',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './repositorio.component.html',
  styleUrl: './repositorio.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepositorioComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly politicaSvc = inject(PoliticaService);
  private readonly repoSvc = inject(RepositorioDocumentalService);
  private readonly docSvc = inject(DocumentoArchivoService);

  readonly tiposDocumento = TIPOS_DOCUMENTO;

  // ── estado base ─────────────────────────────────────────────────────────
  readonly politicaId = signal('');
  readonly politica = signal<Politica | null>(null);
  readonly repositorio = signal<RepositorioDocumental | null>(null);
  readonly documentos = signal<DocumentoArchivo[]>([]);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  // ── expansión de fila ───────────────────────────────────────────────────
  readonly expandidoId = signal<string | null>(null);
  readonly preview = signal<PreviewDocumento | null>(null);
  readonly versiones = signal<VersionDocumento[]>([]);
  readonly cargandoDetalle = signal(false);
  /** URL cruda para los anchor "Abrir en pestaña nueva". */
  readonly previewUrl = computed(() => this.preview()?.urlPreview ?? null);
  /** URL sanitizada para usar en `<iframe [src]>`. */
  readonly previewIframeSrc = computed<SafeResourceUrl | null>(() => {
    const p = this.preview();
    return p ? this.sanitizer.bypassSecurityTrustResourceUrl(p.urlPreview) : null;
  });
  readonly mimeActual = computed(() => this.preview()?.mimeType ?? '');

  // ── subida nueva ────────────────────────────────────────────────────────
  readonly mostrarModalSubida = signal(false);
  readonly subiendo = signal(false);
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly formSubida = this.fb.nonNullable.group({
    tramiteId: ['', Validators.required],
    actividadId: ['', Validators.required],
    nodoId: [''],
    tipoDocumento: ['PDF' as TipoDocumento, Validators.required],
    nombreLogico: ['', Validators.required],
    obligatorio: [false],
  });

  // ── nueva versión ───────────────────────────────────────────────────────
  readonly mostrarModalVersion = signal(false);
  readonly documentoParaVersion = signal<DocumentoArchivo | null>(null);
  readonly archivoVersion = signal<File | null>(null);
  readonly comentarioVersion = signal('');
  readonly subiendoVersion = signal(false);

  constructor() {
    this.politicaId.set(this.route.snapshot.paramMap.get('id') ?? '');
    if (this.politicaId()) this.cargarTodo();
  }

  // ──────────────────────────────────────────────────────────────────────────

  cargarTodo(): void {
    this.loading.set(true);
    this.error.set('');

    this.politicaSvc.buscarPorId(this.politicaId()).subscribe({
      next: (p) => this.politica.set(p),
      error: () => this.error.set('No se pudo cargar la política'),
    });

    this.repoSvc
      .obtenerPorPolitica(this.politicaId())
      .pipe(
        catchError((err) => {
          this.error.set(this.errorMsg(err, 'No se pudo cargar el repositorio'));
          return of(null);
        }),
        switchMap((repo) => {
          this.repositorio.set(repo);
          if (!repo) return of([] as DocumentoArchivo[]);
          return this.docSvc.listarPorRepositorio(repo.id);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (docs) => this.documentos.set(docs),
        error: (err) => this.error.set(this.errorMsg(err, 'Error al listar documentos')),
      });
  }

  reintentarRepositorio(): void {
    this.loading.set(true);
    this.repoSvc.crearReintento(this.politicaId()).subscribe({
      next: (repo) => {
        this.repositorio.set(repo);
        this.documentos.set([]);
        this.loading.set(false);
        this.exito.set('Repositorio creado correctamente');
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.errorMsg(err, 'No se pudo crear el repositorio'));
      },
    });
  }

  // ── expansión + preview ─────────────────────────────────────────────────

  toggleExpandir(doc: DocumentoArchivo): void {
    if (this.expandidoId() === doc.id) {
      this.expandidoId.set(null);
      this.preview.set(null);
      this.versiones.set([]);
      return;
    }

    this.expandidoId.set(doc.id);
    this.preview.set(null);
    this.versiones.set([]);
    this.cargandoDetalle.set(true);

    this.docSvc.preview(doc.id).subscribe({
      next: (p) => this.preview.set(p),
      error: (err) => this.error.set(this.errorMsg(err, 'No se pudo generar el preview')),
    });

    this.docSvc.listarVersiones(doc.id).subscribe({
      next: (v) => {
        this.versiones.set(v);
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.cargandoDetalle.set(false);
        this.versiones.set([]);
      },
    });
  }

  // ── modal: subir nuevo ──────────────────────────────────────────────────

  abrirModalSubida(): void {
    this.archivoSeleccionado.set(null);
    this.formSubida.reset({
      tramiteId: '',
      actividadId: '',
      nodoId: '',
      tipoDocumento: 'PDF',
      nombreLogico: '',
      obligatorio: false,
    });
    this.mostrarModalSubida.set(true);
  }

  cerrarModalSubida(): void {
    this.mostrarModalSubida.set(false);
  }

  onArchivoSubida(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivoSeleccionado.set(file);
  }

  confirmarSubida(): void {
    const repo = this.repositorio();
    const archivo = this.archivoSeleccionado();
    if (!repo || !archivo || this.formSubida.invalid || this.subiendo()) {
      this.formSubida.markAllAsTouched();
      return;
    }

    const v = this.formSubida.getRawValue();
    const req: SubirDocumentoRequest = {
      tramiteId: v.tramiteId,
      actividadId: v.actividadId,
      nodoId: v.nodoId || undefined,
      tipoDocumento: v.tipoDocumento,
      nombreLogico: v.nombreLogico,
      obligatorio: v.obligatorio,
    };

    this.subiendo.set(true);
    this.docSvc
      .subir(repo.id, archivo, req)
      .pipe(finalize(() => this.subiendo.set(false)))
      .subscribe({
        next: () => {
          this.cerrarModalSubida();
          this.cargarTodo();
          this.exito.set(`Documento "${v.nombreLogico}" subido`);
          setTimeout(() => this.exito.set(''), 3000);
        },
        error: (err) => this.error.set(this.errorMsg(err, 'No se pudo subir el documento')),
      });
  }

  // ── modal: nueva versión ────────────────────────────────────────────────

  abrirModalVersion(doc: DocumentoArchivo): void {
    this.documentoParaVersion.set(doc);
    this.archivoVersion.set(null);
    this.comentarioVersion.set('');
    this.mostrarModalVersion.set(true);
  }

  cerrarModalVersion(): void {
    this.mostrarModalVersion.set(false);
    this.documentoParaVersion.set(null);
  }

  onArchivoVersion(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivoVersion.set(file);
  }

  onComentarioVersion(ev: Event): void {
    this.comentarioVersion.set((ev.target as HTMLInputElement).value);
  }

  confirmarVersion(): void {
    const doc = this.documentoParaVersion();
    const archivo = this.archivoVersion();
    if (!doc || !archivo || this.subiendoVersion()) return;

    this.subiendoVersion.set(true);
    this.docSvc
      .nuevaVersion(doc.id, archivo, this.comentarioVersion() || undefined)
      .pipe(finalize(() => this.subiendoVersion.set(false)))
      .subscribe({
        next: () => {
          this.cerrarModalVersion();
          this.exito.set('Nueva versión creada');
          setTimeout(() => this.exito.set(''), 3000);
          this.cargarTodo();
          // Refresca el detalle si la fila sigue expandida
          if (this.expandidoId() === doc.id) {
            this.toggleExpandir(doc);
            setTimeout(() => this.toggleExpandir(doc), 50);
          }
        },
        error: (err) => this.error.set(this.errorMsg(err, 'No se pudo crear la nueva versión')),
      });
  }

  // ── helpers UI ──────────────────────────────────────────────────────────

  esImagen(): boolean {
    return (this.mimeActual() ?? '').startsWith('image/');
  }

  esPdf(): boolean {
    return this.mimeActual() === 'application/pdf';
  }

  tamano(bytes: number | undefined): string {
    if (!bytes) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < u.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
  }

  private errorMsg(err: unknown, fallback: string): string {
    const e = err as { error?: { message?: string; error?: string; code?: string } };
    return e.error?.message ?? e.error?.error ?? e.error?.code ?? fallback;
  }
}
