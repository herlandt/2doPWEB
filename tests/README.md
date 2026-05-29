# Tests — WEB_angular

Esta carpeta agrupa el material de testing del proyecto.

## Tests unitarios (Angular + vitest)

El builder `@angular/build:unit-test` descubre `src/**/*.spec.ts`. Los specs viven
junto al código que prueban:

| Spec | Cubre |
|------|-------|
| `src/app/app.spec.ts` | Bootstrapping del shell de la app. |
| `src/app/core/services/agente.service.spec.ts` | Contrato HTTP del CU-31 (request/response del agente, acción directa, fuente). |
| `src/app/shared/agente/agente-flotante.component.spec.ts` | FAB visible solo autenticado, panel se abre al click. |

### Ejecutar

```bash
npm test
```

(internamente `ng test` con vitest + jsdom)

## Checklist de smoke manual

Marca cada paso al verificar la build en navegador (`npm start`):

- [ ] Login como **Administrador** — aparece el FAB violeta abajo a la derecha.
- [ ] Click FAB → saludo contextual (menciona el módulo actual).
- [ ] Escribir "políticas" → respuesta con botón **"Diseñar nuevo flujo"** → click navega a `/admin/diagramas`.
- [ ] Logout → el FAB desaparece.
- [ ] Login como **Funcionario** → el saludo cambia ("Abrir mi bandeja" como acción).
- [ ] Login como **Cliente** → al preguntar "políticas" se ve la lista pero sin acción de admin.
- [ ] Backend abajo → el agente igualmente responde (fallback KB local).

## Tests del backend del agente

Ver `Backend/src/main/java/com/example/demo/services/AgenteAsistenciaService.java`.
La KB local responde según rol y módulo activo aunque el microservicio externo
(n8n) esté caído. Para pruebas de integración con el backend usar:

```bash
curl -X POST http://localhost:8080/api/agente/consultar \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"consulta":"hola","moduloActivo":"/admin/diagramas"}'
```
