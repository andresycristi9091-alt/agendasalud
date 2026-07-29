# Arquitectura Técnica — Plataforma de Agendamiento Clínico
### Documento complementario: decisiones de ingeniería, modelo de datos, contratos y operación

> Este documento asume el alcance funcional definido en la especificación previa y se enfoca en **cómo construirlo**. Las decisiones están marcadas con su justificación y con la alternativa descartada, porque en varios puntos la elección correcta depende del contexto.

---

## 1. Arquitectura de alto nivel

### 1.1 Decisión estructural: monolito modular, no microservicios

**Recomendación:** monolito modular desplegable como una unidad, con módulos separados por *bounded context* y comunicación interna por interfaces explícitas. Extraer a servicio independiente solo cuando exista una razón concreta (escalamiento asimétrico, aislamiento de cumplimiento, equipo separado).

**Por qué:** el dominio de agendamiento es fuertemente transaccional y relacional. Reservar una cita toca simultáneamente slot, cita, recurso, reglas y auditoría. Repartir eso entre microservicios obliga a sagas y compensaciones para resolver un problema que una transacción ACID resuelve en 3 ms. La mayoría de los proyectos de salud que fracasan técnicamente lo hacen por consistencia eventual mal aplicada al núcleo de reservas.

**Excepciones legítimas para extraer desde el día uno:**

| Servicio | Por qué separado |
|---|---|
| **Notificaciones** | Carga en ráfagas, latencia tolerante, integra proveedores externos inestables |
| **Videollamada / telemedicina** | Perfil de infraestructura completamente distinto (media servers, TURN/STUN) |
| **Analítica y BI** | Cargas de lectura pesadas que no deben competir con el OLTP |
| **Gateway FHIR** | Superficie pública versionada, ciclo de vida propio |

### 1.2 Contextos delimitados

```
┌──────────────────────────────────────────────────────────────┐
│                      API Gateway / BFF                        │
│      (BFF-Paciente · BFF-Clínico · BFF-Admin · FHIR API)     │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│  Identity &   │  Scheduling   │  Booking    │  Rules Engine   │
│  Access       │  (oferta)     │  (demanda)  │  (políticas)    │
├───────────────┼───────────────┼─────────────┼─────────────────┤
│  Patient      │  Catalog      │  Waitlist   │  Audit          │
│  Registry     │  (prestac.)   │             │                 │
└──────────────────────────────────────────────────────────────┘
                              │  (outbox → bus de eventos)
┌──────────────────────────────────────────────────────────────┐
│  Notifications  │  Telehealth  │  Analytics  │  Integrations  │
└──────────────────────────────────────────────────────────────┘
```

La distinción **Scheduling (oferta) vs. Booking (demanda)** es la separación conceptual más útil del diseño. Scheduling responde "¿qué capacidad existe?"; Booking responde "¿quién ocupa qué?". Mezclarlas produce el clásico modelo donde no se puede modificar una plantilla de agenda sin romper citas existentes.

### 1.3 Stack sugerido

| Capa | Elección | Alternativas razonables |
|---|---|---|
| Backend | **TypeScript + NestJS** o **Kotlin + Spring Boot** | Go + Chi, Python + FastAPI |
| Base de datos | **PostgreSQL 16+** | — (los `range types` y `exclusion constraints` son decisivos, ver §3.3) |
| Caché / holds | **Redis 7** | — |
| Bus de eventos | **Kafka** (alto volumen) o **RabbitMQ / SQS** | NATS JetStream |
| Búsqueda | **PostgreSQL FTS + pg_trgm** | OpenSearch si el catálogo supera ~50k términos |
| Frontend paciente | **Next.js (App Router) + React** | Remix, Nuxt |
| Frontend clínico | **React SPA con Vite** + IndexedDB | — (requiere offline, ver §9.2) |
| Móvil | **React Native** o PWA | Nativo si se requiere biometría avanzada |
| Infra | **Kubernetes** o contenedores gestionados (ECS/Cloud Run) | — |
| Observabilidad | **OpenTelemetry** → Grafana/Datadog | — |

**PostgreSQL no es negociable en este dominio.** El resto del stack es sustituible; los tipos de rango temporal y las restricciones de exclusión resuelven en la capa de datos el problema más difícil del sistema. Reimplementar esa garantía en la aplicación es una fuente permanente de bugs de doble reserva.

---

## 2. El problema central: representar la disponibilidad

### 2.1 Materialización vs. cálculo al vuelo

Hay dos formas de responder "¿qué horas hay disponibles el 12 de agosto?":

**A. Cálculo al vuelo (reglas).** Se guardan plantillas de disponibilidad (RRULE tipo iCalendar) y en cada consulta se expanden, se restan bloqueos y citas existentes, y se devuelve el resultado.

- ✅ Cambiar una plantilla es instantáneo y no requiere regenerar nada
- ✅ Almacenamiento mínimo
- ❌ Consultas costosas; "primera hora disponible entre 40 profesionales de 6 sedes" se vuelve inviable
- ❌ Difícil aplicar restricciones de integridad a nivel de base de datos

**B. Materialización de slots.** Un job genera filas concretas en una tabla `slot` para una ventana móvil.

- ✅ Consultas triviales e indexables
- ✅ Se puede aplicar `EXCLUDE` y bloqueo por fila
- ✅ Auditable: se ve exactamente qué se ofreció
- ❌ Requiere reconciliación cuando cambia una plantilla
- ❌ Volumen: 200 profesionales × 20 slots/día × 180 días ≈ 720 000 filas (perfectamente manejable)

**Recomendación: híbrido con materialización como fuente de verdad.**

- Ventana móvil materializada de **180 días**, extendida diariamente por un job.
- Las plantillas (`schedule_template`) son la definición declarativa; los slots son su proyección.
- Al modificar una plantilla se **recalcula solo el rango afectado**, con un algoritmo de reconciliación que nunca borra slots con cita asociada: los marca como `conflicted` y los expone en una bandeja de resolución para el coordinador.

```
regenerar(plantilla, desde, hasta):
  deseados  = expandir_RRULE(plantilla, desde, hasta)
  actuales  = slots_de(plantilla, desde, hasta)

  crear(deseados − actuales)
  eliminar(actuales − deseados  donde  appointment_id IS NULL)
  marcar_conflicto(actuales − deseados  donde  appointment_id IS NOT NULL)
```

Ese último caso —el slot que ya no debería existir pero tiene un paciente encima— es el escenario que en la práctica genera el 80 % de los tickets de soporte. Diseñarlo explícitamente desde el inicio, con interfaz de resolución, ahorra meses.

### 2.2 Recurrencia y zonas horarias

- Almacenar todo instante en **`timestamptz` (UTC)** y guardar además la **zona horaria IANA de la sede** (`America/Santiago`, no un offset fijo).
- Las plantillas se definen en **hora local con RRULE** (RFC 5545). La expansión a UTC ocurre en el momento de materializar, aplicando las reglas de horario de verano vigentes.
- **Actualizar la base de datos tzdata es una tarea de operación crítica.** Los países cambian sus reglas de DST con poca antelación; una tzdata desactualizada produce citas desfasadas en una hora, sin error visible.
- Invariante a testear explícitamente: *un bloque definido como "lunes 09:00 local" debe seguir empezando a las 09:00 locales después de un cambio de horario de verano.*

---

## 3. Modelo de datos

### 3.1 Esquema núcleo (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Estructura organizacional ──────────────────────────────────

CREATE TABLE location (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  name            text NOT NULL,
  timezone        text NOT NULL,              -- IANA, p.ej. 'America/Santiago'
  address         jsonb NOT NULL,
  geo             point,
  active          boolean NOT NULL DEFAULT true
);

CREATE TABLE resource (                        -- box, sillón, equipo
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid NOT NULL REFERENCES location(id),
  kind            text NOT NULL,               -- room | device | chair
  name            text NOT NULL,
  attributes      jsonb NOT NULL DEFAULT '{}', -- {"floor":1,"wheelchair":true}
  active          boolean NOT NULL DEFAULT true
);

CREATE TABLE service (                         -- prestación
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  clinical_name     text NOT NULL,
  patient_name      text NOT NULL,             -- lenguaje del paciente
  default_duration  interval NOT NULL,
  buffer_before     interval NOT NULL DEFAULT '0',
  buffer_after      interval NOT NULL DEFAULT '0',
  required_resource_kinds text[] NOT NULL DEFAULT '{}',
  preparation_notes text,
  active            boolean NOT NULL DEFAULT true
);

-- ── Personas ───────────────────────────────────────────────────

CREATE TABLE patient (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type   text NOT NULL,             -- 'RUT','DNI','PASSPORT'
  identifier_value  text NOT NULL,
  given_name        text NOT NULL,
  family_name       text NOT NULL,
  preferred_name    text,
  birth_date        date NOT NULL,
  phone_e164        text,
  email             text,
  preferred_language text NOT NULL DEFAULT 'es',
  accessibility_needs jsonb NOT NULL DEFAULT '{}',
  merged_into_id    uuid REFERENCES patient(id),   -- deduplicación
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier_type, identifier_value)
);

CREATE TABLE practitioner (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  registry_number   text,
  registry_valid_to date,
  specialties       text[] NOT NULL DEFAULT '{}',
  languages         text[] NOT NULL DEFAULT '{es}',
  active            boolean NOT NULL DEFAULT true
);

-- ── Oferta: plantillas y slots ─────────────────────────────────

CREATE TABLE schedule_template (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES practitioner(id),
  location_id     uuid NOT NULL REFERENCES location(id),
  service_ids     uuid[] NOT NULL,
  rrule           text NOT NULL,               -- RFC 5545
  local_start     time NOT NULL,
  local_end       time NOT NULL,
  slot_duration   interval NOT NULL,
  valid_from      date NOT NULL,
  valid_to        date,
  version         integer NOT NULL DEFAULT 1
);

CREATE TABLE slot (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid REFERENCES schedule_template(id),
  practitioner_id uuid NOT NULL REFERENCES practitioner(id),
  location_id     uuid NOT NULL REFERENCES location(id),
  service_ids     uuid[] NOT NULL,
  period          tstzrange NOT NULL,
  status          text NOT NULL DEFAULT 'free',
      -- free | held | booked | blocked | conflicted
  overbook        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT slot_no_overlap EXCLUDE USING gist (
    practitioner_id WITH =,
    period WITH &&
  ) WHERE (status <> 'blocked' AND overbook = false)
);

CREATE INDEX slot_search_idx
  ON slot USING gist (practitioner_id, period)
  WHERE status = 'free';

CREATE INDEX slot_discovery_idx
  ON slot (location_id, lower(period))
  INCLUDE (service_ids)
  WHERE status = 'free';
```

### 3.2 Citas y máquina de estados

```sql
CREATE TABLE appointment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         uuid UNIQUE REFERENCES slot(id),
  patient_id      uuid NOT NULL REFERENCES patient(id),
  practitioner_id uuid NOT NULL REFERENCES practitioner(id),
  location_id     uuid NOT NULL REFERENCES location(id),
  service_id      uuid NOT NULL REFERENCES service(id),
  period          tstzrange NOT NULL,
  status          text NOT NULL,
  channel         text NOT NULL,   -- patient_web | app | call_center | desk | whatsapp
  modality        text NOT NULL,   -- in_person | telehealth | home
  reason_text     text,
  booked_by       uuid NOT NULL,   -- puede ser distinto del paciente
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  version         integer NOT NULL DEFAULT 1,

  CONSTRAINT appt_no_double_book EXCLUDE USING gist (
    patient_id WITH =,
    period WITH &&
  ) WHERE (status IN ('booked','confirmed','arrived','in_progress'))
) PARTITION BY RANGE (lower(period));

CREATE TABLE appointment_2026_08 PARTITION OF appointment
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Reserva de recursos con la misma garantía a nivel de motor
CREATE TABLE appointment_resource (
  appointment_id  uuid NOT NULL,
  resource_id     uuid NOT NULL REFERENCES resource(id),
  period          tstzrange NOT NULL,          -- denormalizado a propósito
  active          boolean NOT NULL DEFAULT true,
  PRIMARY KEY (appointment_id, resource_id),

  CONSTRAINT resource_no_overlap EXCLUDE USING gist (
    resource_id WITH =,
    period WITH &&
  ) WHERE (active)
);

CREATE TABLE appointment_transition (
  id              bigserial PRIMARY KEY,
  appointment_id  uuid NOT NULL,
  from_status     text,
  to_status       text NOT NULL,
  reason_code     text,
  reason_text     text,
  actor_id        uuid,
  actor_role      text,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
```

**Sobre las restricciones de exclusión.** `appt_no_double_book` impide que un paciente tenga dos citas solapadas y `slot_no_overlap` impide que un profesional tenga dos slots solapados. Son garantías del motor: sobreviven a bugs de aplicación, a condiciones de carrera y a scripts de migración mal escritos. Ninguna validación en código ofrece ese nivel de seguridad.

**Máquina de estados con transiciones válidas explícitas:**

```
requested ──▶ booked ──▶ confirmed ──▶ arrived ──▶ in_progress ──▶ fulfilled
                │            │             │             │
                ▼            ▼             ▼             ▼
            cancelled    cancelled     cancelled     cancelled
                │            │
                ▼            ▼
            rescheduled  noshow (tras ventana de gracia)
```

Implementar como tabla de transiciones permitidas, no como `if/else` disperso:

```sql
CREATE TABLE status_transition_rule (
  from_status  text NOT NULL,
  to_status    text NOT NULL,
  allowed_roles text[] NOT NULL,
  requires_reason boolean NOT NULL DEFAULT false,
  PRIMARY KEY (from_status, to_status)
);
```

Cada transición emite un evento al outbox. Todas las métricas operacionales del §7 se derivan de `appointment_transition`, no de campos mutables de `appointment`.

### 3.3 Concurrencia: el flujo de reserva

El escenario base es que dos pacientes toquen el mismo cupo con milisegundos de diferencia. Se resuelve en tres capas:

**Capa 1 — Hold optimista (UX).** Al abrir el formulario de reserva se toma un hold con TTL.

```sql
CREATE TABLE slot_hold (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id      uuid NOT NULL REFERENCES slot(id),
  session_id   text NOT NULL,
  expires_at   timestamptz NOT NULL,
  released_at  timestamptz
);

CREATE UNIQUE INDEX slot_hold_active_idx
  ON slot_hold (slot_id) WHERE released_at IS NULL;
```

Un job libera holds vencidos cada 30 s; además, toda consulta de disponibilidad ignora holds con `expires_at < now()`. El hold es una mejora de experiencia, **no una garantía de corrección**.

**Capa 2 — Transacción con bloqueo pesimista.**

```sql
BEGIN;

SELECT id, status, period
  FROM slot
 WHERE id = $1
   FOR UPDATE NOWAIT;          -- falla rápido en vez de encolar

-- verificar estado, evaluar reglas, insertar appointment,
-- insertar appointment_resource, insertar outbox

COMMIT;
```

`FOR UPDATE NOWAIT` es preferible a esperar el lock: bajo contención es mejor devolver de inmediato "ese horario se acaba de tomar, estos están libres" que dejar al usuario mirando un spinner.

**Capa 3 — Restricción de exclusión** como red de seguridad final. Si algo se escapa de las capas anteriores, PostgreSQL rechaza el INSERT con `23P01` y la aplicación traduce ese error a un mensaje de recuperación con alternativas.

**Idempotencia.** Toda operación de escritura acepta el header `Idempotency-Key`:

```sql
CREATE TABLE idempotency_record (
  key             text PRIMARY KEY,
  request_hash    text NOT NULL,
  response_status integer,
  response_body   jsonb,
  state           text NOT NULL DEFAULT 'in_progress',
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL
);
```

Si llega la misma clave con el mismo hash de request, se devuelve la respuesta almacenada. Si llega con hash distinto, se responde `422`. Esto elimina las citas duplicadas por doble clic y por reintento de red móvil, que en producción son una fracción no trivial del total.

---

## 4. Motor de reglas configurable

El requisito "las reglas de negocio deben cambiarse sin desplegar código" es lo que más frecuentemente se subestima. Implementarlo bien:

### 4.1 Representación

```json
{
  "id": "derma-lead-time",
  "name": "Anticipación mínima dermatología",
  "priority": 100,
  "phase": "booking",
  "scope": {
    "service_codes": ["DERM-CONS"],
    "channels": ["patient_web", "patient_app"],
    "locations": ["*"]
  },
  "condition": {
    "<": [{ "var": "hours_until_start" }, 24]
  },
  "effect": "deny",
  "message": {
    "es": "Las horas de dermatología deben reservarse con al menos 24 horas de anticipación. La primera hora disponible es {{first_available}}.",
    "en": "Dermatology appointments require at least 24 hours notice."
  },
  "effective_from": "2026-08-01",
  "effective_to": null
}
```

### 4.2 Contrato de evaluación

```typescript
interface RuleContext {
  patient: { id: string; age: number; noShowCount12m: number;
             insurancePlan: string; activeAppointments: number };
  service: { code: string; durationMinutes: number; requiresReferral: boolean };
  slot:    { startsAt: Date; practitionerId: string; locationId: string };
  request: { channel: Channel; actorRole: Role; hoursUntilStart: number };
  referral?: { id: string; validUntil: Date };
}

type RuleEffect = 'allow' | 'deny' | 'require_approval' | 'warn';

interface RuleDecision {
  effect: RuleEffect;
  ruleId: string;
  humanMessage: string;      // obligatorio, localizado
  remediation?: Remediation; // qué puede hacer el usuario
}
```

**Reglas de implementación:**

1. **Toda denegación debe traer mensaje humano y, cuando exista, remediación.** Un `403 Forbidden` sin explicación es un ticket de soporte garantizado.
2. **Motor determinista y sin efectos secundarios.** Nada de llamadas a red dentro de la evaluación; todo el contexto se arma antes.
3. **Evaluación en dos momentos:** al listar disponibilidad (para no mostrar lo que se va a rechazar) y al confirmar la reserva (porque el contexto pudo cambiar). Misma implementación en ambos puntos, sin duplicar lógica.
4. **Versionado y simulación.** Antes de activar una regla, poder ejecutarla contra los últimos 30 días de tráfico real y reportar cuántas reservas habría bloqueado. Esto evita el clásico despliegue de viernes que deja al centro sin poder agendar.
5. **Motor de expresiones:** JsonLogic para reglas simples, o **CEL (Common Expression Language)** si se requiere más potencia, por su sandbox y garantía de terminación. Evitar exponer un lenguaje Turing-completo a usuarios administrativos.

---

## 5. API y contratos

### 5.1 API interna (REST orientada a recursos)

```http
GET  /api/v1/availability
       ?serviceCode=DERM-CONS
       &locationIds=uuid,uuid
       &from=2026-08-01&to=2026-08-31
       &modality=in_person
       &practitionerGender=F
       &page[size]=50

POST /api/v1/holds                      Idempotency-Key: <uuid>
     { "slotId": "...", "sessionId": "..." }
     → 201 { "holdId": "...", "expiresAt": "2026-08-01T14:35:00Z" }

POST /api/v1/appointments               Idempotency-Key: <uuid>
     { "holdId": "...", "patientId": "...", "reasonText": "...",
       "consents": [{ "type": "data_processing", "version": "3.1" }] }
     → 201 | 409 SLOT_TAKEN | 422 RULE_DENIED

PATCH /api/v1/appointments/{id}/status
     { "toStatus": "cancelled", "reasonCode": "patient_unavailable" }
     If-Match: "3"                      ← control de concurrencia optimista

POST /api/v1/appointments/{id}/reschedule
     { "newSlotId": "...", "reasonCode": "..." }
```

**Errores con forma estable (RFC 9457 — Problem Details):**

```json
{
  "type": "https://api.centro.cl/errors/rule-denied",
  "title": "Reserva no permitida",
  "status": 422,
  "detail": "Las horas de dermatología deben reservarse con al menos 24 horas de anticipación.",
  "ruleId": "derma-lead-time",
  "remediation": {
    "kind": "suggest_alternatives",
    "slots": [{ "slotId": "...", "startsAt": "2026-08-03T09:00:00Z" }]
  }
}
```

### 5.2 Interoperabilidad: HL7 FHIR R4

Exponer un gateway FHIR desde el inicio, aunque no haya integración inmediata. Es el idioma común del sector y evita rehacer el modelo después.

**Mapeo de recursos:**

| Concepto interno | Recurso FHIR |
|---|---|
| `patient` | `Patient` |
| `practitioner` | `Practitioner` + `PractitionerRole` |
| `location` | `Location` |
| `resource` (box, equipo) | `Location` (type=room) o `Device` |
| `service` | `HealthcareService` |
| `schedule_template` | `Schedule` |
| `slot` | `Slot` (status: free · busy · busy-tentative) |
| `appointment` | `Appointment` |
| Atención realizada | `Encounter` |

```http
GET /fhir/Slot?schedule.actor=Practitioner/123
              &start=ge2026-08-01&start=le2026-08-31
              &status=free

POST /fhir/Appointment
{
  "resourceType": "Appointment",
  "status": "booked",
  "serviceType": [{ "coding": [{ "system": "...", "code": "DERM-CONS" }]}],
  "start": "2026-08-12T13:00:00Z",
  "end":   "2026-08-12T13:30:00Z",
  "slot":  [{ "reference": "Slot/abc" }],
  "participant": [
    { "actor": { "reference": "Patient/xyz" },      "status": "accepted" },
    { "actor": { "reference": "Practitioner/123" }, "status": "accepted" }
  ]
}
```

**A revisar según el ecosistema local:** el *Argonaut Scheduling Implementation Guide* define operaciones de búsqueda y reserva sobre estos recursos, y **SMART on FHIR** es el estándar de autorización para integrarse con fichas clínicas electrónicas. Conviene verificar qué perfiles nacionales aplican (muchos países publican guías de implementación propias) antes de definir el mapeo definitivo.

**Realidad operacional:** buena parte de los sistemas hospitalarios instalados aún hablan **HL7 v2.x** (mensajes `SIU^S12` para agendamiento, `ADT^A04` para registro). Presupuestar un adaptador v2 ↔ FHIR con un motor de integración (Mirth Connect, Rhapsody, o propio). No asumir FHIR en el otro extremo.

---

## 6. Arquitectura de eventos

### 6.1 Patrón outbox transaccional

Nunca publicar a un bus dentro de la transacción de negocio. Escribir el evento en la misma transacción y publicar aparte.

```sql
CREATE TABLE outbox (
  id             bigserial PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id   uuid NOT NULL,
  event_type     text NOT NULL,
  payload        jsonb NOT NULL,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz
);

CREATE INDEX outbox_pending_idx ON outbox (id) WHERE published_at IS NULL;
```

Un publicador lee con `FOR UPDATE SKIP LOCKED`, envía al bus y marca. Alternativa superior en volumen alto: **CDC con Debezium** leyendo el WAL, que elimina el polling.

### 6.2 Catálogo de eventos

```
AppointmentBooked · AppointmentConfirmed · AppointmentRescheduled
AppointmentCancelled · AppointmentNoShow · AppointmentFulfilled
PatientCheckedIn · SlotReleased · SlotBlocked
WaitlistEntryCreated · WaitlistOfferSent · WaitlistOfferAccepted
ScheduleTemplateChanged · PractitionerAbsenceDeclared
```

Consumidores: notificaciones, motor de lista de espera, proyecciones analíticas, integraciones salientes, auditoría.

**Los consumidores deben ser idempotentes.** El bus garantiza *at-least-once*; una entrega duplicada de `AppointmentBooked` no puede producir dos SMS. Deduplicar por `(event_id, consumer)` en una tabla de procesados.

### 6.3 Motor de lista de espera

Es el consumidor más valioso y el de lógica más delicada.

```
al recibir SlotReleased(slot):
  candidatos = waitlist
      .filtrar(service_id compatible, location aceptada)
      .filtrar(disponibilidad_declarada ∋ slot.period)
      .filtrar(reglas_de_negocio permiten)
      .ordenar_por(prioridad_clínica DESC,
                   antigüedad_en_lista ASC,
                   score_aceptación DESC)

  para cada candidato en candidatos[0:N]:
      crear hold(slot, ttl=30min, owner=candidato)
      enviar_oferta(candidato)
      esperar_respuesta(30min)
      si acepta: reservar y salir
      si no: liberar hold, continuar
```

**Decisiones finas que importan:**

- **Ofertar en serie, no en paralelo**, salvo que se acepte generar frustración. Ofrecer el mismo cupo a cinco personas y dárselo al primero que responde destruye la confianza en el sistema.
- **Ventana de aceptación adaptativa**: 30 minutos si la cita es en 2 semanas; 10 minutos si es mañana; ninguna oferta automática si es en menos de 2 horas (ahí conviene llamar por teléfono).
- **Respetar horas de silencio** (no enviar ofertas a las 03:00).
- **Límite de ofertas rechazadas** antes de pedir al paciente que actualice su disponibilidad declarada.

---

## 7. Notificaciones

### 7.1 Arquitectura

```
Evento → Planificador → cola con retraso (delayed queue) → Worker
                                                              │
                              ┌───────────────────────────────┤
                              ▼               ▼               ▼
                        Proveedor SMS   Proveedor email   Push/WhatsApp
                              │               │               │
                              └──────► Webhooks de estado ◄────┘
                                        (delivered/failed)
```

```sql
CREATE TABLE notification (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid,
  patient_id     uuid NOT NULL,
  template_key   text NOT NULL,
  template_version integer NOT NULL,
  channel        text NOT NULL,
  locale         text NOT NULL,
  scheduled_for  timestamptz NOT NULL,
  sent_at        timestamptz,
  provider_id    text,
  status         text NOT NULL DEFAULT 'scheduled',
  attempts       integer NOT NULL DEFAULT 0,
  dedup_key      text NOT NULL,
  cost_cents     integer,
  UNIQUE (dedup_key)
);
```

**Puntos críticos:**

- **`dedup_key`** compuesto por `(appointment_id, template_key, scheduled_date)` evita el desastre clásico de enviar 4 recordatorios tras un reintento de despliegue.
- **Cancelación en cascada:** al cancelar una cita hay que cancelar sus notificaciones futuras aún no enviadas. Suena obvio; se olvida siempre.
- **Escalamiento de canal:** si el SMS falla, intentar WhatsApp; si falla, correo; si todo falla, marcar para gestión por call center.
- **Manejo de respuestas entrantes** (el paciente responde "1" para confirmar): webhook que resuelve el número a la cita más próxima pendiente de confirmar. Ambigüedad si hay varias → responder pidiendo desambiguación.
- **Control de costo** con presupuesto por sede y alertas, porque un bug en el planificador puede generar decenas de miles de SMS en minutos. Rate limit duro a nivel de worker, no solo del proveedor.

---

## 8. Seguridad y cumplimiento

### 8.1 Autenticación y autorización

- **OIDC** con proveedor de identidad (Keycloak, Auth0, Entra ID). MFA obligatorio para roles con acceso a datos clínicos.
- **Autorización en dos niveles:** RBAC para "qué operaciones" + ABAC para "sobre qué filas". Un médico puede ver `Appointment`, pero solo las de su sede/servicio, salvo emergencia declarada.
- **Row Level Security de PostgreSQL** como defensa en profundidad:

```sql
ALTER TABLE appointment ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointment_practitioner_scope ON appointment
  FOR SELECT
  USING (
    practitioner_id = current_setting('app.practitioner_id')::uuid
    OR location_id = ANY(
         string_to_array(current_setting('app.location_scope'), ',')::uuid[])
  );
```

- **Break-the-glass**: acceso de emergencia fuera del ámbito habitual, permitido pero con justificación obligatoria, alerta inmediata al oficial de privacidad y revisión posterior. No bloquear el acceso urgente; auditarlo con dureza.

### 8.2 Auditoría inmutable

```sql
CREATE TABLE audit_log (
  id            bigserial PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  actor_id      uuid,
  actor_role    text,
  action        text NOT NULL,          -- read | create | update | delete | export
  resource_type text NOT NULL,
  resource_id   uuid,
  patient_id    uuid,                   -- para el informe de accesos del titular
  ip_address    inet,
  user_agent    text,
  justification text,
  payload_diff  jsonb,
  prev_hash     bytea,
  row_hash      bytea NOT NULL
);

REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
```

`row_hash = sha256(prev_hash || campos_canonicalizados)` forma una cadena verificable: cualquier alteración retroactiva rompe la cadena. Un job diario verifica la integridad y ancla el hash del día en almacenamiento WORM.

**Registrar las lecturas, no solo las escrituras.** En salud, "quién vio la ficha de esta paciente" es la pregunta que efectivamente se hace en una investigación.

### 8.3 Protección de datos

- **Cifrado en reposo** a nivel de volumen + **cifrado a nivel de campo** para los datos más sensibles (`reason_text`, notas, documentos adjuntos) con claves gestionadas en KMS/HSM y rotación.
- **Seudonimización para ambientes no productivos**: nunca copiar producción a QA. Generador de datos sintéticos con distribuciones realistas.
- **Retención y borrado** parametrizables por tipo de dato, con la particularidad de que el dato clínico suele tener retención legal larga (10–15 años) que **prevalece sobre el derecho al olvido**. El sistema debe distinguir "borrar datos de contacto" de "borrar registro clínico".
- **Derechos del titular**: exportación de datos en formato legible y registro de accesos, resolubles vía interfaz sin intervención de ingeniería.
- **Minimización**: el módulo de agendamiento no necesita el historial clínico completo. Traer por referencia, no por copia.

### 8.4 Superficie de ataque específica

| Riesgo | Mitigación |
|---|---|
| Enumeración de pacientes vía búsqueda por documento | Rate limiting agresivo, respuestas indistinguibles, CAPTCHA progresivo |
| Enumeración de disponibilidad para scraping | Cuotas por sesión, paginación limitada |
| IDOR en `GET /appointments/{id}` | Autorización por recurso obligatoria, IDs no secuenciales (UUIDv7) |
| Fuga por logs | Redacción de PII en toda la cadena de logging, revisada en CI |
| Enlaces de confirmación reenviados | Tokens de un solo uso, corta vida, ligados al canal |
| Inyección en plantillas de notificación | Escapado estricto, plantillas sin ejecución de código |

---

## 9. Frontend

### 9.1 Portal del paciente

- **Next.js con renderizado en servidor** para las páginas de descubrimiento (SEO real: "dermatólogo en [comuna]" es una fuente de demanda) y cliente para el flujo de reserva.
- **Presupuesto de rendimiento estricto**: LCP < 2,5 s en 3G lenta con dispositivo de gama baja. Medido en CI con Lighthouse, no en el MacBook del desarrollador.
- **Consulta de disponibilidad con `stale-while-revalidate`** y prefetch de los días adyacentes al navegar el calendario.
- **Actualización optimista con reversión** al tomar el hold.
- **Accesibilidad en CI**: `axe-core` en las pruebas E2E, con fallo del build ante violaciones de nivel A/AA. Complementado con testeo manual con lector de pantalla, que detecta lo que ninguna herramienta automática detecta.

### 9.2 Consola clínica: requisito offline

Los boxes clínicos pierden conectividad. La agenda del día debe seguir siendo consultable y operable.

- **Service Worker + IndexedDB** con la agenda del día precargada.
- **Cola de mutaciones offline**: marcar llegada, iniciar/cerrar atención y marcar inasistencia se encolan localmente y se sincronizan al recuperar red.
- **Resolución de conflictos** explícita: si el estado cambió en el servidor mientras se estaba offline, mostrar ambas versiones y pedir decisión. Nunca resolver silenciosamente por "el último gana" en datos clínicos.
- **Indicador de estado de sincronización siempre visible** con contador de acciones pendientes.

### 9.3 Sistema de diseño como código

- Tokens en **W3C Design Tokens Format**, compilados con Style Dictionary a CSS custom properties, temas iOS/Android y documentación.
- Biblioteca de componentes con **Storybook**, pruebas de regresión visual (Chromatic o Playwright screenshots) y documentación de accesibilidad por componente.
- Un único paquete consumido por los tres frontends, con métricas de espaciado parametrizadas por densidad (`comfortable` para paciente, `compact` para clínico).

---

## 10. Analítica y predicción de inasistencia

### 10.1 Modelo dimensional

Proyecciones alimentadas por eventos hacia un almacén analítico separado (no consultar el OLTP):

```
fact_appointment      (grano: una cita)
  ├── dim_date, dim_time_of_day
  ├── dim_patient      (seudonimizado)
  ├── dim_practitioner
  ├── dim_location, dim_service
  ├── dim_channel
  └── medidas: lead_time_days, wait_minutes, duration_actual_minutes,
               reschedule_count, was_noshow, was_confirmed

fact_slot_offering    (grano: un slot ofertado)
  └── medidas: was_filled, time_to_fill_hours, was_overbooked
```

`fact_slot_offering` es lo que permite calcular utilización real y *days to third next available* — la métrica estándar internacional de acceso, más honesta que "primera hora disponible" porque descarta cancelaciones de último minuto.

### 10.2 Predicción de inasistencia: advertencia importante

Es técnicamente sencillo (gradient boosting sobre historial, AUC típico 0,70–0,80) y **éticamente delicado**.

**Variables razonables:** historial de inasistencia del paciente, antelación de la reserva, día y hora, si confirmó, número de reagendamientos previos, canal, clima, primera consulta vs. control, tiempo desde la última atención.

**El riesgo real:** las variables predictivas de inasistencia correlacionan fuertemente con vulnerabilidad socioeconómica —distancia al centro, acceso a transporte, trabajo sin permiso para ausentarse—. Un modelo que use esto para **restringir el acceso** al autoagendamiento o para sobrecupar sistemáticamente a los pacientes de alto riesgo institucionaliza la desigualdad y crea un ciclo de retroalimentación: el paciente recibe peor servicio, falta más, el modelo se confirma.

**Diseño responsable:**

1. Usar la predicción para **agregar apoyo**, no para restringir: más recordatorios, llamada personal, oferta de telemedicina, coordinación de transporte.
2. Nunca usar directamente atributos protegidos ni proxies evidentes (dirección, previsión, nacionalidad) como *features*.
3. Auditar disparidad de tasas de error entre subgrupos, no solo la exactitud global.
4. Si se usa para sobrecupo, aplicarlo a nivel de **bloque agregado** ("este bloque históricamente rinde 82 %, agregar 1 cupo"), no de individuo.
5. Documentar el modelo, sus limitaciones y su gobernanza. Mantener revisión humana.

---

## 11. Pruebas

### 11.1 Estrategia por capa

| Nivel | Qué cubre | Herramientas |
|---|---|---|
| Unitarias | Motor de reglas, máquina de estados, expansión de RRULE | Vitest / JUnit |
| **Basadas en propiedades** | Invariantes del motor de agendamiento | fast-check / jqwik / Hypothesis |
| Integración | Restricciones de BD, transacciones, RLS | Testcontainers |
| Contrato | FHIR y APIs externas | Pact, validador FHIR oficial |
| E2E | Recorridos críticos por rol | Playwright |
| Carga | Picos de contención | k6 |
| Accesibilidad | WCAG AA automatizable | axe-core en CI |

### 11.2 Pruebas basadas en propiedades: el mayor retorno

La lógica de agendamiento es exactamente el tipo de dominio donde las pruebas por ejemplos dejan huecos. Definir invariantes y dejar que el generador busque contraejemplos:

```typescript
property('nunca dos citas activas se solapan para un profesional',
  arbitraryBookingSequence(), async (ops) => {
    const db = await freshDb();
    await Promise.allSettled(ops.map(op => bookingService.execute(op)));
    const appts = await db.activeAppointmentsByPractitioner();
    return appts.every(list => noOverlaps(list));
  });

property('el cambio de horario de verano preserva la hora local',
  arbitraryTemplate(), (tpl) => {
    const slots = materialize(tpl, dstTransitionRange);
    return slots.every(s => localTime(s.start, tpl.tz) === tpl.localStart);
  });

property('cancelar y reagendar conserva exactamente una cita activa',
  arbitraryAppointment(), async (appt) => { /* ... */ });
```

### 11.3 Pruebas de carga con perfil realista

El patrón de carga no es uniforme. Modelar los tres picos reales:

1. **Apertura de agenda** (ej. día 1 del mes a las 08:00): miles de usuarios compitiendo por los mismos cupos. Prueba de contención pura.
2. **Lunes 08:00–10:00**: pico general sostenido.
3. **Envío masivo de recordatorios**: 20 000 mensajes en 10 minutos + el tráfico entrante de quienes hacen clic.

El escenario 1 es el que rompe sistemas. Objetivo: p99 de la operación de reserva < 500 ms con 500 usuarios concurrentes sobre 50 slots.

---

## 12. Operación

### 12.1 Migraciones de base de datos

Patrón **expand–migrate–contract** obligatorio, porque el sistema no puede tener ventanas de mantención en horario clínico:

```
1. Expand    → agregar columna nueva, nullable, sin restricción
2. Backfill  → poblar por lotes, sin bloquear (lotes de 5 000, con pausa)
3. Dual-write→ la aplicación escribe en ambas
4. Migrate   → lecturas apuntan a la nueva
5. Contract  → eliminar la antigua (despliegue posterior)
```

Nunca usar `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT` sobre tablas grandes en versiones antiguas de PostgreSQL, ni crear índices sin `CONCURRENTLY`.

### 12.2 Despliegue

- **Feature flags** para todo cambio de comportamiento visible, con posibilidad de activación por sede. El piloto en una sede requiere que la plataforma soporte configuración diferenciada.
- **Despliegue canario** con validación automática de SLO antes de promover.
- **Rollback ensayado**, incluyendo el caso más difícil: revertir código cuando la migración de datos ya avanzó.

### 12.3 Observabilidad y SLO

```
SLO Disponibilidad API de reserva     : 99,9 % mensual
SLO Latencia consulta disponibilidad  : p95 < 400 ms
SLO Latencia confirmación de reserva  : p95 < 800 ms
SLO Entrega de recordatorio           : 99 % dentro de ±15 min de lo planificado
SLO Frescura del outbox               : p99 < 30 s
```

**Alertas que importan más que el CPU:**

- Tasa de error `SLOT_TAKEN` por encima del basal → problema de caché o de holds
- Slots en estado `conflicted` sin resolver > umbral
- Backlog de outbox creciendo monótonamente
- Caída en la tasa de confirmación de pacientes → posible falla silenciosa del proveedor de SMS
- Cero reservas en una sede durante un horario hábil → falla que ninguna métrica técnica muestra

Esa última clase de alerta —**monitoreo de resultado de negocio, no de infraestructura**— es la que detecta las fallas realmente costosas. Un sistema puede estar 100 % "verde" mientras nadie logra agendar.

### 12.4 Continuidad

- RPO ≤ 5 min (WAL archiving continuo), RTO ≤ 1 h, con **restauración ensayada trimestralmente**. Un respaldo no probado no es un respaldo.
- **Modo degradado documentado**: generación e impresión automática de las agendas del día siguiente, procedimiento manual en papel, y protocolo de reingreso de datos al recuperar el servicio.
- Réplica de lectura en otra zona de disponibilidad; failover automatizado y ensayado.

---

## 13. Riesgos técnicos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Doble reserva bajo contención | Alto — pérdida de confianza inmediata | Exclusion constraints + holds + pruebas de propiedades |
| Deriva de zona horaria / DST | Alto — citas a la hora equivocada | UTC + tz IANA + tzdata actualizada + tests de transición |
| Regla de negocio rígida | Alto — el centro no puede operar | Motor de reglas con simulación previa |
| Plantilla modificada con citas asociadas | Medio — pacientes huérfanos | Estado `conflicted` + bandeja de resolución |
| Tormenta de notificaciones | Medio — costo y daño reputacional | Dedup key + rate limit duro + presupuesto |
| Integración HIS más lenta de lo previsto | Alto — bloquea el cronograma | Adaptador desacoplado, operar en paralelo antes de integrar |
| Duplicación de registros de pacientes | Medio — crece con el tiempo | Detección probabilística + flujo de fusión con `merged_into_id` |
| Sesgo del modelo de inasistencia | Alto — daño a población vulnerable | Solo para agregar apoyo, auditoría de disparidad |

---

## 14. Qué construir primero

Si hubiera que elegir el orden de los primeros tres meses, priorizar por riesgo técnico, no por visibilidad:

1. **Modelo de datos + restricciones de exclusión + máquina de estados.** Es lo más caro de cambiar después.
2. **Materialización de slots con reconciliación.** Incluyendo el caso `conflicted` desde el inicio.
3. **Flujo de reserva transaccional con holds e idempotencia.** Con pruebas de propiedades y de carga antes de tener interfaz.
4. **Motor de reglas con simulación.** Antes de que aparezca la primera regla urgente.
5. **Outbox + auditoría.** Retroajustar auditoría a un sistema en producción es doloroso y suele quedar incompleto.

La interfaz bonita puede esperar. Un sistema de agendamiento con un modelo de concurrencia débil no se arregla con rediseño.
