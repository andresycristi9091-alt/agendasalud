# CLAUDE.md — Plataforma de Agendamiento Clínico

Contexto permanente del proyecto. Lee esto antes de cualquier tarea.
Documentación extendida en `docs/`. Tickets de trabajo en `tasks/`.

---

## Qué es este proyecto

Plataforma de agendamiento de citas para un centro de salud, con tres frentes:
portal de pacientes (autogestión), consola clínica (agenda del profesional) y
backoffice de administración (configuración, reglas, analítica).

El núcleo del problema **no es CRUD**: es concurrencia sobre recursos escasos,
reglas de negocio que cambian sin despliegue, y correctitud temporal
(zonas horarias, recurrencia, horario de verano). Trata cualquier cambio en
`packages/domain` o en las migraciones con ese nivel de cuidado.

---

## Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Runtime | Node.js 22 LTS, TypeScript 5.6 `strict` | `noUncheckedIndexedAccess: true` |
| API | NestJS 10 | Módulos = bounded contexts |
| Base de datos | **PostgreSQL 16** | No sustituible (ver `docs/adr/0002`) |
| Acceso a datos | **Kysely** (query builder tipado) | Sin ORM: el SQL de este dominio es específico |
| Migraciones | **dbmate** (SQL plano, up/down) | `reference/db/migrations` |
| Validación | Zod | Esquemas compartidos en `packages/contracts` |
| Colas / caché | Redis 7 + BullMQ | Jobs y holds |
| Bus de eventos | Outbox en Postgres → publicador → Redis Streams | Migrar a Kafka solo si el volumen lo exige |
| Portal paciente | Next.js 15 (App Router) | SSR para descubrimiento, CSR para reserva |
| Consola clínica | Vite + React 19 | SPA con offline (Service Worker + IndexedDB) |
| Pruebas | Vitest · Testcontainers · **fast-check** · Playwright · k6 | |
| Observabilidad | OpenTelemetry | Trazas, métricas y logs |
| Gestor de paquetes | pnpm + Turborepo | Monorepo |

---

## Estructura del monorepo

```
apps/
  api/              NestJS — API REST + BFFs
  worker/           Jobs: materialización, outbox, notificaciones, lista de espera
  web-patient/      Next.js — portal de pacientes
  web-clinical/     Vite React — consola clínica
  web-admin/        Vite React — backoffice
packages/
  domain/           ★ Lógica pura: máquina de estados, motor de reglas, RRULE.
                      SIN dependencias de I/O. Aquí van las pruebas de propiedades.
  db/               Esquema Kysely, migraciones, helpers de transacción
  contracts/        Esquemas Zod, tipos compartidos, generación de OpenAPI
  ui/               Sistema de diseño (tokens + componentes)
  telemetry/        Configuración OTel compartida
docs/               Alcance funcional, arquitectura, ADRs, invariantes
tasks/              Tickets de trabajo por fase
```

**Regla de dependencias:** `domain` no importa de nada. `db` importa de `domain`.
`api` y `worker` importan de ambos. Los frontends solo de `contracts` y `ui`.
Si necesitas romper esto, para y pregunta.

---

## Comandos

```bash
pnpm install
pnpm dev                  # levanta todo con docker-compose (pg, redis) + apps
pnpm db:up                # aplica migraciones
pnpm db:new <nombre>      # crea par de migraciones up/down
pnpm db:reset             # recrea la BD desde cero + seeds
pnpm test                 # unitarias + propiedades
pnpm test:integration     # con Testcontainers (levanta Postgres real)
pnpm test:e2e             # Playwright
pnpm test:load            # k6, requiere entorno levantado
pnpm lint && pnpm typecheck
pnpm build
```

Antes de dar una tarea por terminada: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration`.

---

## Invariantes del dominio — NO NEGOCIABLES

Estos son los que rompen el sistema en producción. La lista completa y su
mapeo a pruebas está en `docs/invariantes.md`. Resumen:

1. **Dos citas activas nunca se solapan para el mismo profesional.**
   Garantizado por `EXCLUDE USING gist` en `slot`, no por código.
2. **Un paciente nunca tiene dos citas activas solapadas.**
   Garantizado por `EXCLUDE USING gist` en `appointment`.
3. **Un recurso (box, equipo) nunca está doblemente reservado.**
   Garantizado por `EXCLUDE USING gist` en `appointment_resource`.
4. **Toda escritura pasa por `Idempotency-Key`.** Un reintento no crea una segunda cita.
5. **Toda transición de estado se registra en `appointment_transition` y emite evento al outbox,
   en la misma transacción.** Sin excepciones.
6. **Todo instante se persiste en `timestamptz` (UTC).** La zona horaria IANA vive en `location`.
   Nunca almacenar offsets fijos ni `timestamp without time zone`.
7. **Una plantilla de agenda modificada nunca borra slots con cita asociada.**
   Los marca `conflicted` para resolución humana.
8. **Toda denegación del motor de reglas trae mensaje humano localizado.**
   Un 403 sin explicación es un bug, no un comportamiento.
9. **La auditoría es append-only con cadena de hash.** `UPDATE`/`DELETE` revocados a nivel de rol.
10. **Ningún dato personal en logs, URLs, query strings ni mensajes de error.**

---

## Convenciones de código

**General**
- TypeScript estricto. Prohibido `any` sin comentario `// eslint-disable` justificado.
- Errores de dominio como clases tipadas, nunca `throw new Error("...")` genérico.
- Fechas: siempre `Date` en UTC o `Temporal` si está disponible. Nunca strings sin zona.
- Dinero: enteros en la unidad mínima (`cents`), nunca `float`.
- IDs: **UUIDv7** (ordenables por tiempo, no enumerables).

**Base de datos**
- Migraciones SQL plano, siempre con `down` funcional.
- Patrón **expand–migrate–contract** obligatorio. Nunca un `ALTER` bloqueante sobre tabla grande.
- Índices siempre `CREATE INDEX CONCURRENTLY` en migraciones sobre tablas pobladas.
- Nombres en `snake_case`, tablas en singular (`appointment`, no `appointments`).
- Toda tabla con datos de paciente lleva política RLS.

**API**
- REST orientada a recursos. Errores en formato RFC 9457 (Problem Details).
- Versionado en la ruta: `/api/v1/...`
- Concurrencia optimista con `If-Match` / `ETag` en actualizaciones.
- Paginación por cursor, nunca por offset, en listados que crecen.

**Frontend**
- Accesibilidad WCAG 2.2 AA. `axe-core` en E2E: una violación A/AA rompe el build.
- Sin texto embebido: todo pasa por i18n desde el primer commit.
- Componentes del sistema de diseño en `packages/ui`. No inventar estilos locales.
- Estados obligatorios en toda vista con datos: cargando, vacío, error, sin conexión.

---

## Qué NO hacer

- ❌ **No reemplazar las restricciones de exclusión por validación en aplicación.**
  Es la garantía más importante del sistema.
- ❌ **No introducir microservicios.** Ver `docs/adr/0001`. El núcleo es transaccional.
- ❌ **No publicar al bus de eventos dentro de la transacción de negocio.** Usa el outbox.
- ❌ **No agregar un ORM** (Prisma, TypeORM). La decisión de Kysely es deliberada.
- ❌ **No codificar reglas de negocio en `if/else`.** Van al motor de reglas configurable.
- ❌ **No usar `SELECT *`** en código de producción.
- ❌ **No copiar datos de producción a otros entornos.** Usa el generador sintético (`pnpm db:seed`).
- ❌ **No usar el modelo de predicción de inasistencia para restringir acceso.** Ver `docs/adr/0005`.
- ❌ **No hacer `git push --force`** sobre ramas compartidas ni commits directos a `main`.

---

## Flujo de trabajo

1. Lee el ticket en `tasks/`. Si algo es ambiguo, **pregunta antes de codificar**.
2. Rama: `feat/F1-07-booking-transaction` (prefijo del ticket).
3. Escribe las pruebas de los criterios de aceptación **antes** de la implementación
   cuando la tarea toque `packages/domain`.
4. Commits en formato Conventional Commits, en español o inglés pero consistente.
5. Antes del PR: lint, typecheck, unitarias e integración en verde.
6. El PR describe: qué invariantes toca, qué migraciones incluye y cómo revertir.

---

## Cuando modifiques algo sensible, avisa explícitamente

Marca en tu respuesta si tu cambio toca cualquiera de estos:

- Migraciones de base de datos
- Restricciones de exclusión o índices únicos
- La máquina de estados de `appointment`
- El motor de reglas
- Lógica de autorización, RLS o auditoría
- Plantillas de notificación (riesgo de envío masivo)
- Manejo de zonas horarias

---

## Glosario mínimo

| Término | Significado |
|---|---|
| **Slot** | Unidad de oferta: un profesional, un rango de tiempo, una sede |
| **Hold** | Reserva temporal de un slot mientras el paciente completa el formulario |
| **Sobrecupo** | Cita agregada por encima de la capacidad nominal, autorizada explícitamente |
| **Conflicted** | Slot que dejó de existir en la plantilla pero tiene cita asociada |
| **No-show** | Paciente que no asiste sin cancelar |
| **DTNA** | *Days to Third Next Available* — métrica estándar de acceso |
| **Prestación** | Servicio clínico agendable (`service`) |
| **Previsión** | Sistema de aseguramiento en salud del paciente |
