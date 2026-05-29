import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Actividad } from '../../core/models/actividad.model';
import {
  NIVELES_ACCESO,
  NivelAcceso,
  PermisoPuntoAtencionRequest,
  TIPOS_DOCUMENTO_VISIBLES,
} from '../../core/models/permiso-punto-atencion.model';
import { Politica } from '../../core/models/politica.model';
import { PermisoDocumentalService } from '../../core/services/permiso-documental.service';
import { PoliticaService } from '../../core/services/politica.service';

/**
 * CU-36 — Modal para configurar el permiso documental de una actividad
 * en el contexto de una política específica.
 *
 * Uso:
 *   <app-permiso-documental-modal
 *     [actividad]="actividadElegida"
 *     (cerrado)="modalAbierto = false"
 *   />
 */
@Component({
  selector: 'app-permiso-documental-modal',
  imports: [FormsModule],
  templateUrl: './permiso-documental-modal.component.html',
  styleUrl: './permiso-documental-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermisoDocumentalModalComponent {
  private readonly permisoSvc = inject(PermisoDocumentalService);
  private readonly politicaSvc = inject(PoliticaService);

  /** Si se setea con una actividad, el modal está abierto. */
  readonly actividad = input<Actividad | null>(null);
  readonly cerrado = output<void>();

  readonly niveles = NIVELES_ACCESO;
  readonly tiposDoc = TIPOS_DOCUMENTO_VISIBLES;

  readonly politicas = signal<Politica[]>([]);
  readonly politicaSeleccionadaId = signal('');
  readonly nivelSeleccionado = signal<NivelAcceso>('SOLO_LECTURA');
  readonly tiposSeleccionados = signal<string[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly exito = signal('');

  readonly abierto = computed(() => this.actividad() !== null);

  readonly nivelDescripcion = computed(() => {
    const n = this.niveles.find((x) => x.value === this.nivelSeleccionado());
    return n?.descripcion ?? '';
  });

  constructor() {
    // Cargar políticas y, al abrir el modal, recargar el permiso vigente.
    this.politicaSvc.listar().subscribe({
      next: (p) => this.politicas.set(p ?? []),
    });

    // Cada vez que cambia actividad o política seleccionada → recargar
    effect(() => {
      const act = this.actividad();
      const polId = this.politicaSeleccionadaId();
      if (!act) return;
      if (polId) this.cargarPermisoVigente(polId, act.id);
    });
  }

  private cargarPermisoVigente(politicaId: string, actividadId: string): void {
    this.cargando.set(true);
    this.error.set('');
    this.permisoSvc.obtener(politicaId, actividadId).subscribe({
      next: (p) => {
        this.nivelSeleccionado.set(p.nivelAcceso as NivelAcceso);
        this.tiposSeleccionados.set(p.tiposDocumentoVisibles ?? []);
        this.cargando.set(false);
      },
      error: () => {
        // Si no hay permiso configurado, dejamos defaults
        this.nivelSeleccionado.set('SOLO_LECTURA');
        this.tiposSeleccionados.set([]);
        this.cargando.set(false);
      },
    });
  }

  cambiarPolitica(ev: Event): void {
    this.politicaSeleccionadaId.set((ev.target as HTMLSelectElement).value);
  }

  toggleTipo(t: string): void {
    this.tiposSeleccionados.update((curr) =>
      curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t],
    );
  }

  isTipoSeleccionado(t: string): boolean {
    return this.tiposSeleccionados().includes(t);
  }

  guardar(): void {
    const act = this.actividad();
    const polId = this.politicaSeleccionadaId();
    if (!act || !polId || this.guardando()) {
      if (!polId) this.error.set('Selecciona una política primero');
      return;
    }
    this.guardando.set(true);
    this.error.set('');

    const req: PermisoPuntoAtencionRequest = {
      politicaId: polId,
      actividadId: act.id,
      nivelAcceso: this.nivelSeleccionado(),
      tiposDocumentoVisibles: this.tiposSeleccionados(),
    };

    this.permisoSvc.upsert(req).subscribe({
      next: () => {
        this.exito.set(`Permiso ${this.nivelSeleccionado()} guardado para la actividad.`);
        this.guardando.set(false);
        setTimeout(() => this.exito.set(''), 3000);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message ?? 'No se pudo guardar el permiso');
        this.guardando.set(false);
      },
    });
  }

  cerrar(): void {
    this.politicaSeleccionadaId.set('');
    this.nivelSeleccionado.set('SOLO_LECTURA');
    this.tiposSeleccionados.set([]);
    this.error.set('');
    this.exito.set('');
    this.cerrado.emit();
  }
}
