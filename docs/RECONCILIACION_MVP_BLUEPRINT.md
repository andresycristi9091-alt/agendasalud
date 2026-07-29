# Reconciliacion: MVP actual vs Blueprint de Agendamiento Clinico

Fecha: 2026-07-29.

El cliente entrego un blueprint completo de plataforma de agendamiento clinico
(`docs/agendamiento-clinico/`): arquitectura NestJS + PostgreSQL 16 + Kysely,
13 invariantes de dominio con pruebas asociadas, ADRs, migraciones SQL de
referencia y 14 tickets de Fase 1.

Este documento mapea ese blueprint contra el MVP en produccion
(Next.js 16 + Google Sheets + Google Calendar + Supabase Auth) y define el
camino incremental. **El blueprint es la arquitectura objetivo; el MVP sigue
siendo el sistema vigente para NeuroPlus hasta que se decida la migracion.**

---

## 1. Diferencias estructurales

| Dimension | MVP actual | Blueprint objetivo |
|---|---|---|
| Persistencia | Google Sheets (sin transacciones ni constraints) | PostgreSQL 16 con `EXCLUDE USING gist` |
| Backend | Next.js API routes (monolito serverless) | NestJS monolito modular + worker |
| Anti doble reserva | Lock in-memory + re-check + rate limit | Restriccion de exclusion en BD (garantia absoluta) |
| Reglas de negocio | Codigo + variables de entorno (booking rules) | Motor de reglas configurable sin despliegue |
| Slots | Generados al vuelo desde bloques de disponibilidad | Materializados desde plantillas RRULE + reconciliacion |
| Identidad | Supabase Auth + usuarios internos en Sheets | RBAC + RLS en Postgres |
| Eventos | Llamadas directas (email best effort) | Outbox transaccional -> Redis Streams |
| Auditoria | Hoja `auditLog` append-only por convencion | Append-only con cadena de hash y REVOKE a nivel de rol |

Punto clave: **Supabase ya es PostgreSQL**. La ruta de migracion natural no
requiere adoptar NestJS de inmediato: se puede mover el nucleo transaccional
(citas, slots, holds) de Sheets a Supabase Postgres con las restricciones de
exclusion del blueprint, manteniendo Next.js como API. Eso satisface el ADR
0002 (Postgres no sustituible) con el menor costo de transicion.

---

## 2. Estado de los 13 invariantes en el MVP

| Inv. | Enunciado corto | Estado MVP | Detalle |
|---|---|---|---|
| I-01 | No solapamiento por profesional | PARCIAL | Lock por slot (`lib/mutex.ts`) + re-check `isSlotTaken` + chequeo de solapamiento real en disponibilidad. Sin garantia de BD: dos instancias serverless podrian colisionar. |
| I-02 | Paciente sin citas solapadas | NO | No se valida. La hoja `patients` existe pero no se cruza al reservar. |
| I-03 | Exclusividad de recursos fisicos | N/A | El MVP no modela boxes/equipos. |
| I-04 | Idempotencia de escrituras | PARCIAL | El lock + re-check evita el doble clic sobre el mismo slot. No hay `Idempotency-Key` formal. |
| I-05 | Transiciones registradas + evento | PARCIAL | `auditLog` registra `status_change` desde dashboard. La cancelacion publica (`/cancelar/[id]`) NO se audita aun. Sin transaccion atomica (limite de Sheets). |
| I-06 | Correctitud temporal | PARCIAL | Hora chilena centralizada en `lib/date.ts` con DST calculado y tests. Pero se persisten fecha/hora local como strings, no `timestamptz` UTC. |
| I-07 | Plantilla no borra citas | PARCIAL | Borrar disponibilidad no borra citas (viven en hojas separadas), pero no existe estado `conflicted` ni bandeja de resolucion. |
| I-08 | Denegacion explicable | OK | Booking rules y excepciones devuelven mensajes humanos en espanol. |
| I-09 | Auditoria inmutable con hash | PARCIAL | `auditLog` es append-only por convencion; Sheets no permite REVOKE ni hay cadena de hash. |
| I-10 | Registro de accesos de lectura | NO | No implementado. |
| I-11 | Sin PII en telemetria | PARCIAL | La auditoria sanitiza claves sensibles y enmascara emails. Algunos `console.warn` podrian filtrar datos en errores: revisar. |
| I-12 | Notificaciones no duplicadas | PARCIAL | `remindersSent` deduplica por `tipo-citaId` y el cron ignora canceladas. Sin indice unico real. |
| I-13 | Aislamiento por ambito | PARCIAL | Permisos por centro en capa de aplicacion (`lib/auth/permissions.ts`). Sin RLS como segunda defensa. |

---

## 3. Camino incremental propuesto

### Etapa 0 - Cierres baratos en el MVP (sin cambiar stack)

1. Auditar la cancelacion publica (`POST /api/public/appointments/[id]/cancel`) — hoy es el unico cambio de estado sin evento de auditoria (I-05).
2. Al eliminar un bloque de disponibilidad, avisar si hay citas activas en esas fechas (aproximacion a I-07).
3. Barrido de `console.warn/error` para no interpolar emails/nombres de pacientes (I-11).

### Etapa 1 - Nucleo transaccional en Supabase Postgres (decision del cliente)

Migrar SOLO `appointments` + `slots/holds` de Sheets a Supabase Postgres:

- Tablas `appointment`, `slot` con `EXCLUDE USING gist` segun `reference/db/migrations/004_scheduling.sql` y `005_booking.sql` (adaptadas).
- `Idempotency-Key` en `POST /api/public/appointments` (I-04 completo).
- `appointment_transition` + trigger de respaldo (I-05 completo).
- Sheets pasa a ser espejo de lectura para el cliente (export), no fuente de verdad.
- Next.js se mantiene; no se adopta NestJS en esta etapa.

Esto resuelve de un golpe I-01, I-02, I-04, I-05 y habilita RLS (I-13).

### Etapa 2 - Blueprint completo (proyecto nuevo)

Si el producto escala a multi-centro real con portal de pacientes robusto,
arrancar el monorepo del blueprint siguiendo `tasks/fase-1/` (F1-01 en adelante)
como repositorio nuevo, reutilizando lo aprendido y los datos migrados en Etapa 1.
El blueprint asume equipo y meses de trabajo (Fase 1 = meses 1-4): es una
reescritura, no un refactor.

---

## 4. Reglas del blueprint adoptadas desde ya en el MVP

Aunque el stack aun no coincide, estas convenciones del `CLAUDE.md` del
blueprint aplican desde hoy al codigo del MVP:

- Toda denegacion lleva mensaje humano en espanol (ya cumplido).
- Ningun dato personal en logs, URLs ni query strings (sanitizacion de auditoria ya lo hace; extender a logs).
- Zona horaria: la logica temporal vive centralizada en `lib/date.ts`; nunca offsets sueltos en componentes.
- Errores explicitos, nunca silenciar (`.catch` siempre con log).
- Cambios sensibles (auth, auditoria, zona horaria, notificaciones) se marcan explicitamente en el resumen del PR/commit.

## 5. Decisiones pendientes del cliente

1. **Cuando iniciar Etapa 1** (migracion del nucleo a Supabase Postgres). Es el paso de mayor retorno: convierte el anti doble booking de "muy improbable" a "imposible".
2. Si la Etapa 2 (blueprint completo) sera evolucion de este repo o repositorio nuevo, como sugiere su README.
3. Jurisdiccion/normativa definitiva (el blueprint la deja generica; el MVP asume Ley 19.628 Chile).
