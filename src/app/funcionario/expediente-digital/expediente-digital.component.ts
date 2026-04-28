import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TramiteC2Service } from '../../core/services/tramite-c2.service';

@Component({
  selector: 'app-expediente-digital',
  imports: [RouterLink],
  templateUrl: './expediente-digital.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpedienteDigitalComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tramiteC2Svc = inject(TramiteC2Service);
  private readonly authSvc = inject(AuthService);

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

  // CU-30: Dictado por voz
  readonly grabando = signal(false);
  readonly errorMicrofono = signal('');
  private mediaRecorder: MediaRecorder | null = null;
  private chunksAudio: BlobPart[] = [];

  constructor() {
    this.cargarExpediente();
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

  // CU-30: iniciar grabación con MediaRecorder
  iniciarGrabacion(): void {
    this.errorMicrofono.set('');
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMicrofono.set('Tu navegador no soporta grabación de audio.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.chunksAudio = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunksAudio.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.chunksAudio, { type: 'audio/webm' });
        this.enviarAudio(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      this.mediaRecorder.start();
      this.grabando.set(true);
    }).catch(() => {
      this.errorMicrofono.set('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    });
  }

  detenerGrabacion(): void {
    if (this.mediaRecorder && this.grabando()) {
      this.mediaRecorder.stop();
      this.grabando.set(false);
    }
  }

  private enviarAudio(audioBlob: Blob): void {
    const exp = this.expediente();
    const secciones: any[] = exp?.secciones ?? [];
    const activa = secciones.find((s: any) => s.infoSeccion?.estado === 'en_curso');
    const seccionId: string | null = activa?.infoSeccion?.id ?? null;

    if (!seccionId) {
      this.errorMicrofono.set('No hay sección activa en este expediente para transcribir.');
      return;
    }

    this.justificacion.set('Transcribiendo audio...');

    this.tramiteC2Svc.transcribirVoz(seccionId, audioBlob).subscribe({
      next: (res) => {
        this.justificacion.set(res.textoTranscrito ?? '');
      },
      error: () => {
        this.justificacion.set('');
        this.errorMicrofono.set(
          'El servicio de transcripción no está disponible. Escribe tu respuesta manualmente.',
        );
      },
    });
  }

  formatearFecha(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-BO');
    } catch {
      return iso;
    }
  }
}
