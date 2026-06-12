// IA local del asistente (CU-31) SIN INTERNET — inferencia on-device en el
// navegador con el modelo de intención entrenado en TensorFlow (réplica web de
// mobile/lib/services/ia_local/ia_local_service.dart). Cuando el backend no
// responde, el chat clasifica la intención con la red neuronal local y responde
// desde una base de conocimiento; si la confianza es baja, cae a palabras clave.

import { Injectable } from '@angular/core';
import { ModeloLocal } from './modelo-local';

export interface RespuestaLocal {
  respuesta: string;
  accion: null;
  fuente: string;
}

/** Igual que AgenteAsistenciaService.UMBRAL_CONFIANZA y el móvil. */
const UMBRAL_CONFIANZA = 0.45;
const BASE_ML = 'ml';

@Injectable({ providedIn: 'root' })
export class IaLocalService {
  private intencionPromesa?: Promise<ModeloLocal | null>;

  /** Carga perezosa (una vez) del modelo de intención. Devuelve null si falla. */
  private modeloIntencion(): Promise<ModeloLocal | null> {
    this.intencionPromesa ??= ModeloLocal.cargar(
      `${BASE_ML}/pesos_intencion.json`,
      `${BASE_ML}/vocab_intencion.json`,
      `${BASE_ML}/etiquetas_intencion.json`,
    ).catch((e) => {
      console.warn('IA local: modelo de intención no disponible:', e);
      return null;
    });
    return this.intencionPromesa;
  }

  /** (intención, confianza) del modelo local, o null si no pudo cargarse. */
  async clasificarIntencion(texto: string): Promise<{ intencion: string; confianza: number } | null> {
    const modelo = await this.modeloIntencion();
    if (!modelo) return null;
    const r = modelo.clasificar(texto);
    return { intencion: r.etiqueta, confianza: r.confianza };
  }

  /**
   * Responde la consulta sin conexión: clasifica con la red local y, si la
   * confianza es baja o "fuera_de_alcance", cae a la base de conocimiento por
   * palabras clave. Nunca lanza: siempre devuelve una respuesta útil.
   */
  async responderOffline(consulta: string, moduloActivo: string): Promise<RespuestaLocal> {
    const modulo = (moduloActivo || '').toLowerCase();
    let respuesta: string;
    try {
      const cls = await this.clasificarIntencion(consulta);
      respuesta =
        cls && cls.confianza >= UMBRAL_CONFIANZA && cls.intencion !== 'fuera_de_alcance'
          ? this.porIntencion(cls.intencion, modulo)
          : this.porPalabrasClave(consulta, modulo);
    } catch {
      respuesta = this.porPalabrasClave(consulta, modulo);
    }
    return { respuesta, accion: null, fuente: 'local-tflite' };
  }

  // ── Base de conocimiento por intención (18 etiquetas: cliente/func/admin) ──

  private porIntencion(intencion: string, modulo: string): string {
    switch (intencion) {
      case 'saludo':
        return this.saludo(modulo);
      case 'capacidades':
        return 'Puedo guiarte sin conexión: recomendarte un trámite (descríbeme tu caso), explicarte cómo iniciarlo, qué documentos te piden, cómo ver el estado y tus notificaciones. Para funcionarios y admin también explico bandeja, atención de trámites, decisiones, diseño de flujos, usuarios y métricas.';
      case 'recomendar_tramite':
        return 'Cuéntame qué necesitas (por ejemplo "una conexión nueva de luz para mi casa") y te oriento sobre qué trámite iniciar. Cuando vuelva la conexión podrás verlos todos en "Explorar" e iniciarlo.';
      case 'listar_tramites':
        return 'Los trámites disponibles se ven en "Explorar". Ahí aparece el catálogo con su nombre y descripción; abre el que necesites y toca "Iniciar".';
      case 'como_iniciar':
        return 'Para iniciar un trámite ve a "Explorar", elige el que necesitas y toca "Iniciar". Se creará el expediente y avanzará solo al primer paso del flujo.';
      case 'estado_tramite':
        return 'El estado de tus trámites está en "Mis trámites". Toca uno para ver su línea de tiempo y en qué paso del flujo se encuentra.';
      case 'documentos':
        return 'Si tu trámite pide documentos los verás al abrirlo, en "Completar documentos". Sube cada requisito (foto o archivo); cuando estén todos, el trámite avanza solo.';
      case 'notificaciones':
        return 'Recibes una notificación cuando tu trámite cambia de estado o se te asigna uno nuevo. Revísalas en la campana de la app.';
      case 'func_bandeja':
        return 'Tu bandeja de entrada reúne los trámites asignados a tu departamento. Ábrela desde "Bandeja de entrada"; puedes ordenarla por fecha de llegada o por la prioridad que sugiere la IA (más urgente arriba).';
      case 'func_atender':
        return 'Para atender un trámite: ábrelo desde tu bandeja, revisa el expediente y los documentos, completa los campos de tu sección y guarda. Al cerrar tu actividad el trámite avanza solo al siguiente nodo del flujo.';
      case 'func_decidir':
        return 'Al cerrar tu actividad eliges: Aprobar (continúa), Rechazar (lo detiene), Derivar (lo envía a otro departamento) u Observar (lo devuelve al cliente: marca los documentos a corregir y el sistema le notifica).';
      case 'func_voz':
        return 'En tu sección puedes dictar: toca el micrófono y habla; la IA transcribe y rellena los campos mencionados. Revisa siempre lo capturado antes de guardar. (El dictado real requiere conexión con el servidor de IA.)';
      case 'admin_politicas':
        return 'Las políticas (tipos de trámite) se gestionan en Admin → Políticas: créala, define sus datos y actívala para que los clientes la vean. Puedes editarla, archivarla o dejarla en borrador.';
      case 'admin_diagramas':
        return 'El flujo de cada política se diseña en el editor de diagramas: agrega nodos de inicio, actividad, decisión, fork/join y fin, y conéctalos. También puedes generarlo describiéndolo por prompt a la IA (requiere conexión).';
      case 'admin_colaborar':
        return 'Puedes compartir un diagrama con otro usuario dándole permiso de editor o de solo lectura. Quien recibe la invitación lo ve en "Compartidos conmigo".';
      case 'admin_usuarios':
        return 'En Admin → Usuarios creas y editas funcionarios y administradores, y los asignas a un departamento. También gestionas los departamentos de la organización.';
      case 'admin_analitica':
        return 'En el panel de analítica ves métricas de los trámites, cuellos de botella, anomalías detectadas por la IA y reportes en lenguaje natural (estos últimos requieren conexión).';
      default: // fuera_de_alcance
        return 'Soy el asistente de trámites; con eso no te puedo ayudar 😅. Pero sí puedo recomendarte un trámite, explicarte cómo iniciarlo, qué documentos necesitas o cómo ver su estado. ¿Te ayudo con alguno?';
    }
  }

  // ── Fallback por palabras clave (confianza baja del modelo) ──

  private porPalabrasClave(original: string, modulo: string): string {
    const c = this.sinAcentos((original || '').toLowerCase());

    if (this.esSaludo(c)) return this.saludo(modulo);
    if (/(recomien|sugier|que tramite|cual tramite|necesito|quiero|requiero|deseo|solicitar|tramitar)/.test(c))
      return this.porIntencion('recomendar_tramite', modulo);
    if (/(inici|empez|empiez|nuevo tramite|crear.*tramite)/.test(c))
      return this.porIntencion('como_iniciar', modulo);
    if (/(mis tramite|estado de mi|seguim|como va mi|en que va)/.test(c))
      return this.porIntencion('estado_tramite', modulo);
    if (/(document|requisit|adjunt|subir|carga|falta.*papel)/.test(c))
      return this.porIntencion('documentos', modulo);
    if (/(notif|aviso|alerta|novedad)/.test(c)) return this.porIntencion('notificaciones', modulo);
    if (/(bandeja|asignad|cola de|pendientes)/.test(c)) return this.porIntencion('func_bandeja', modulo);
    if (/(aprob|rechaz|deriv|observ|devolver|denegar)/.test(c)) return this.porIntencion('func_decidir', modulo);
    if (/(diagrama|flujo|workflow|fork|join|nodo)/.test(c)) return this.porIntencion('admin_diagramas', modulo);
    if (/(politica|tipo de tramite)/.test(c)) return this.porIntencion('admin_politicas', modulo);
    if (/(usuario|funcionario|departamento|admin)/.test(c)) return this.porIntencion('admin_usuarios', modulo);
    if (/(metrica|reporte|anomal|cuello|estadistic|analitic)/.test(c)) return this.porIntencion('admin_analitica', modulo);
    if (/(voz|dictar|microfono|hablar)/.test(c)) return this.porIntencion('func_voz', modulo);

    // Sin coincidencia clara: orientación general.
    return this.porIntencion('capacidades', modulo);
  }

  // ── Helpers ──

  private saludo(modulo: string): string {
    if (modulo.includes('diagrama'))
      return 'Hola, estás en diseño de flujos. ¿Necesitas ayuda para agregar un nodo o un fork paralelo?';
    if (modulo.includes('expediente'))
      return 'Hola, estás revisando un expediente. Solo puedes editar tu sección activa. ¿Te explico cómo dictar por voz?';
    if (modulo.includes('metrica') || modulo.includes('dashboard'))
      return 'Hola, estás viendo métricas. Puedo explicarte los cuellos de botella detectados.';
    if (modulo.includes('bandeja')) return 'Hola, estás en tu bandeja. ¿Te explico cómo atender u ordenar tus trámites?';
    if (modulo.includes('tramite'))
      return 'Hola, estás en trámites. ¿Quieres consultar el estado de uno o iniciar uno nuevo?';
    return 'Hola, soy tu asistente del sistema de trámites (modo sin conexión). ¿En qué puedo ayudarte?';
  }

  private esSaludo(c: string): boolean {
    const t = c.trim();
    return (
      t.length === 0 ||
      /(^|\s)(hola|holis|buenas|buenos|hey|saludos|que tal|que onda|ola|alo)(\s|$)/.test(t)
    );
  }

  private sinAcentos(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
}
