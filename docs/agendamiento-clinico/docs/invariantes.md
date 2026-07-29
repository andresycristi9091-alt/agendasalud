# Invariantes del dominio

Cada invariante lleva: enunciado, dónde se garantiza, y la prueba que lo verifica.
**Si una prueba de esta lista falla, no se despliega.** No hay excepciones ni "lo arreglamos después".

---

## I-01 · No solapamiento de agenda por profesional

> Dos slots activos del mismo profesional nunca se solapan en el tiempo,
> salvo que estén explícitamente marcados como sobrecupo.

**Garantía:** `EXCLUDE USING gist (practitioner_id WITH =, period WITH &&) WHERE (status <> 'blocked' AND overbook = false)` en `slot`.

**Pruebas:**
- `packages/db/test/constraints.spec.ts` → inserción directa solapada debe fallar con `23P01`
- Propiedad: `domain/test/scheduling.prop.ts` → dada cualquier secuencia de operaciones de agenda concurrentes, el conjunto resultante no tiene solapamientos

---

## I-02 · Un paciente no puede estar en dos lugares a la vez

> Un paciente nunca tiene dos citas en estado activo (`booked`, `confirmed`,
> `arrived`, `in_progress`) con períodos solapados.

**Garantía:** `EXCLUDE USING gist (patient_id WITH =, period WITH &&) WHERE (status IN (...))` en `appointment`.

**Excepción documentada:** citas de modalidad distinta que el centro permita simultáneas
(ej. examen de laboratorio mientras espera consulta). Si se requiere, se implementa
con una columna `overlap_group` en el predicado, **nunca eliminando la restricción**.

**Pruebas:** `packages/db/test/constraints.spec.ts` + propiedad de secuencias de reserva.

---

## I-03 · Exclusividad de recursos físicos

> Un box, sillón o equipo nunca está asignado a dos citas simultáneas.

**Garantía:** `EXCLUDE USING gist (resource_id WITH =, period WITH &&) WHERE (active)` en `appointment_resource`.
El `period` está denormalizado y se mantiene sincronizado por trigger desde `appointment`.

**Pruebas:** integración + verificación de que el trigger propaga cambios de horario al reagendar.

---

## I-04 · Idempotencia de las escrituras

> Ejecutar la misma operación de escritura N veces con la misma `Idempotency-Key`
> produce exactamente el mismo efecto que ejecutarla una vez.

**Garantía:** tabla `idempotency_record` con PK sobre la clave, consultada antes de ejecutar.
Misma clave + mismo hash de request → se devuelve la respuesta almacenada.
Misma clave + hash distinto → `422`.

**Pruebas:**
- Integración: 50 requests idénticos en paralelo → exactamente 1 cita creada
- E2E: doble clic en el botón de confirmar → 1 cita

---

## I-05 · Trazabilidad completa de transiciones

> Toda transición de estado de una cita queda registrada en `appointment_transition`
> y genera una fila en `outbox`, dentro de la misma transacción que el cambio.

**Garantía:** función de aplicación única (`AppointmentService.transition`) + trigger de respaldo
que rechaza `UPDATE` de `appointment.status` sin fila de transición correspondiente.

**Pruebas:**
- Integración: para cada transición válida, verificar que existen las tres escrituras
- Propiedad: el estado actual de una cita siempre es reconstruible replicando sus transiciones

---

## I-06 · Correctitud temporal

> a) Todo instante se persiste en UTC.
> b) Un bloque de plantilla definido en hora local mantiene su hora local a través
>    de un cambio de horario de verano.
> c) Ninguna materialización genera slots duplicados ni huecos en la transición DST.

**Garantía:** `timestamptz` en todas las columnas temporales; expansión de RRULE en la
zona IANA de la sede; prohibición por lint de `timestamp without time zone`.

**Pruebas:**
- Propiedad `dst.prop.ts`: para toda plantilla y toda transición DST conocida de las
  zonas configuradas, la hora local de los slots generados se preserva
- Casos fijos para las transiciones del hemisferio sur (donde el cambio ocurre en meses
  opuestos y es la fuente clásica del bug)

---

## I-07 · Ninguna cita queda huérfana

> Modificar o eliminar una plantilla de agenda nunca borra un slot que tenga cita asociada.
> Esos slots pasan a estado `conflicted` y aparecen en la bandeja de resolución.

**Garantía:** el algoritmo de reconciliación (`domain/schedule/reconcile.ts`) más una
FK con `ON DELETE RESTRICT` desde `appointment` hacia `slot`.

**Pruebas:**
- Unitarias del reconciliador con matriz de casos: reducción de horario, cambio de duración,
  cambio de sede, eliminación de día, adelanto de vigencia
- Integración: tras reconciliar, `count(citas activas) antes == count(citas activas) después`

---

## I-08 · Toda denegación es explicable

> Cuando el motor de reglas rechaza una operación, la respuesta incluye
> mensaje humano localizado y, cuando existe, una remediación accionable.

**Garantía:** el tipo `RuleDecision` obliga a `humanMessage` en el nivel de tipos;
prueba de contrato que recorre el catálogo de reglas activas y verifica que todas
tienen mensaje en todos los idiomas soportados.

**Pruebas:** `domain/test/rules-catalog.spec.ts`

---

## I-09 · Auditoría inmutable y verificable

> `audit_log` es append-only. La cadena de hashes permite detectar cualquier
> alteración retroactiva.

**Garantía:** `REVOKE UPDATE, DELETE` sobre el rol de aplicación;
`row_hash = sha256(prev_hash || payload_canónico)`; job diario de verificación.

**Pruebas:**
- Integración: intentar `UPDATE` con el rol de aplicación debe fallar
- Unitaria: alterar una fila en una cadena simulada rompe la verificación

---

## I-10 · Registro de accesos de lectura

> Toda lectura de datos clínicos o de identificación de un paciente por parte de
> un usuario del sistema queda registrada con actor, momento y justificación cuando aplica.

**Garantía:** interceptor de NestJS sobre los controladores marcados `@AuditsRead()`.

**Pruebas:** integración por endpoint sensible.

---

## I-11 · Sin datos personales en telemetría

> Ningún dato identificable aparece en logs, trazas, métricas, URLs ni mensajes de error.

**Garantía:** redactor en el pipeline de logging con lista de campos sensibles;
regla de lint que prohíbe interpolar campos de `patient` en llamadas al logger;
prohibición de parámetros de identificación en query strings.

**Pruebas:** prueba de integración que ejecuta los recorridos críticos y grepea la
salida de logs contra el set de datos de prueba conocido.

---

## I-12 · Ninguna notificación duplicada

> El mismo paciente no recibe dos veces la misma notificación para la misma cita.
> Cancelar una cita cancela sus notificaciones futuras no enviadas.

**Garantía:** índice único sobre `notification.dedup_key`; consumidor del evento
`AppointmentCancelled` que marca como `cancelled` las notificaciones pendientes.

**Pruebas:**
- Integración: reprocesar el mismo evento 10 veces → 1 notificación
- Integración: cancelar cita → 0 notificaciones pendientes

---

## I-13 · Aislamiento por ámbito de autorización

> Un usuario nunca lee ni modifica citas fuera de su ámbito autorizado,
> salvo acceso de emergencia declarado (*break-the-glass*), que queda auditado y alertado.

**Garantía:** RBAC en el guard de NestJS + Row Level Security en PostgreSQL como
defensa en profundidad.

**Pruebas:** matriz completa rol × operación × ámbito en integración, incluyendo el
caso de que el guard esté deshabilitado (RLS debe seguir bloqueando).

---

## Cómo agregar un invariante

1. Enunciarlo aquí en una frase verificable.
2. Elegir el nivel de garantía más bajo posible: motor de BD > tipo > runtime.
3. Escribir la prueba antes que la implementación.
4. Si el invariante es sobre concurrencia o tiempo, la prueba debe ser **basada en propiedades**,
   no por ejemplos. Los ejemplos no encuentran estos bugs.
