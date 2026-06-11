import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DocumentoArchivoService } from '../../core/services/documento-archivo.service';
import { mensajeAmigable } from '../../core/utils/error-messages';

// El api.js de OnlyOffice expone window.DocsAPI.DocEditor.
declare global {
  interface Window {
    DocsAPI?: { DocEditor: new (id: string, config: unknown) => { destroyEditor?: () => void } };
  }
}

/**
 * Editor colaborativo de documentos Office (.docx/.xlsx/.pptx) del repositorio.
 * Pide la config firmada al backend, carga el api.js del Document Server y abre
 * el documento. Varios funcionarios que abran el MISMO documento co-editan en
 * tiempo real (lo gestiona OnlyOffice); al guardar, el backend crea una versión.
 */
@Component({
  selector: 'app-onlyoffice-editor',
  template: `
    <div style="height: 100vh; display: flex; flex-direction: column">
      <div class="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-light">
        <button type="button" class="btn btn-sm btn-outline-secondary" (click)="volver()">← Volver</button>
        <span class="fw-semibold">Edición colaborativa de documento (OnlyOffice)</span>
        @if (cargando()) {
          <span class="text-muted small ms-2">
            <span class="spinner-border spinner-border-sm me-1"></span> Abriendo editor…
          </span>
        }
      </div>
      @if (error()) {
        <div class="alert alert-danger m-3">{{ error() }}</div>
      }
      <div id="onlyoffice-editor" style="flex: 1; min-height: 0"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlyofficeEditorComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly docSvc = inject(DocumentoArchivoService);

  readonly id = this.route.snapshot.params['id'] as string;
  readonly cargando = signal(true);
  readonly error = signal('');
  private editor: { destroyEditor?: () => void } | null = null;

  constructor() {
    this.docSvc.onlyofficeConfig(this.id).subscribe({
      next: (resp) => this.abrir(resp.serverUrl, resp.config),
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeAmigable(err));
      },
    });
  }

  private abrir(serverUrl: string, config: unknown): void {
    if (!serverUrl) {
      this.cargando.set(false);
      this.error.set('El servidor de OnlyOffice no está configurado.');
      return;
    }
    this.cargarScript(`${serverUrl.replace(/\/$/, '')}/web-apps/apps/api/documents/api.js`)
      .then(() => {
        this.cargando.set(false);
        if (!window.DocsAPI) {
          this.error.set('No se pudo cargar el editor (DocsAPI no disponible).');
          return;
        }
        this.editor = new window.DocsAPI.DocEditor('onlyoffice-editor', config);
      })
      .catch(() => {
        this.cargando.set(false);
        this.error.set('No se pudo contactar al servidor de OnlyOffice.');
      });
  }

  private cargarScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.DocsAPI) return resolve();
      const existente = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (existente) {
        existente.addEventListener('load', () => resolve());
        existente.addEventListener('error', () => reject());
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.body.appendChild(s);
    });
  }

  volver(): void {
    history.back();
  }

  ngOnDestroy(): void {
    try {
      this.editor?.destroyEditor?.();
    } catch {
      /* el editor ya estaba cerrado */
    }
  }
}
