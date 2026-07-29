# Etapa 1: nucleo transaccional de citas en Supabase Postgres

Runbook de activacion. Codigo desplegado el 2026-07-29; la activacion es una
decision operativa que se ejecuta con estos pasos, sin nuevo despliegue de codigo.

## Que cambia

| Antes (Sheets) | Despues (Postgres) |
|---|---|
| Anti doble reserva: lock in-memory + re-check | `EXCLUDE USING gist` en la base: **imposible** insertar solapes activos (I-01) |
| Sin control por paciente | Un paciente no puede tener dos citas activas solapadas (I-02) |
| Reintento puede duplicar | `Idempotency-Key` + hash del request: reintentos devuelven la misma cita (I-04) |
| Sin historial de estados | Tabla `appointment_transition` en la misma transaccion (I-05) |
| Sheets fuente de verdad | Postgres fuente de verdad; Sheets queda como espejo de lectura best effort |

El resto del sistema (profesionales, disponibilidad, usuarios, auditoria,
pacientes) sigue en Sheets por ahora.

## Activacion (3 pasos)

### 1. Ejecutar la migracion SQL

En el dashboard de Supabase → SQL Editor → pegar y ejecutar el contenido de
`supabase/migrations/0001_booking_core.sql`. Crea:

- Tabla `appointment` con dos restricciones de exclusion (profesional y paciente).
- Tabla `appointment_transition` (historial de estados).
- Tabla `idempotency_record`.
- Funciones `book_appointment`, `transition_appointment`, `import_appointment`
  (transaccionales, solo ejecutables por la service role).
- RLS activo sin policies: solo la service role accede.

### 2. Definir variables en Vercel

```
BOOKING_BACKEND=postgres
SUPABASE_SERVICE_ROLE_KEY=<service role del proyecto Supabase>
```

`NEXT_PUBLIC_SUPABASE_URL` ya existe. Redeploy para que tomen efecto.

### 3. Backfill de citas historicas

Con sesion de admin iniciada, ejecutar una vez:

```bash
curl -X POST https://<dominio>/api/admin/migrate-appointments -H "Cookie: <cookie de sesion admin>"
```

(o desde la consola del navegador logueado como admin:
`fetch('/api/admin/migrate-appointments', { method: 'POST' }).then(r => r.json()).then(console.log)`)

La respuesta reporta `imported`, `alreadyExists`, `conflicts`, `invalid` y
`failures`. Es idempotente: se puede repetir sin duplicar.

- `conflicts`: citas activas historicas que se solapan entre si. La restriccion
  de exclusion las rechaza a proposito; resolverlas a mano (cancelar o reagendar
  una de las dos en Sheets) y volver a ejecutar.
- `invalid`: filas con id no-UUID o fecha/hora malformada; corregir en Sheets si
  importa conservarlas.

## Verificacion post-activacion

1. Agendar una cita de prueba en `/agendar/<slug>` → debe aparecer en la tabla
   `appointment` de Supabase Y en la hoja `appointments` (espejo).
2. Intentar reservar el mismo horario desde dos pestanas → la segunda debe
   recibir "Ese horario acaba de ser tomado".
3. En Supabase: `select * from appointment_transition order by created_at desc limit 5;`
   → debe mostrar las transiciones.
4. Doble clic / reintento del mismo formulario → una sola cita (revisar
   `idempotency_record`).

## Rollback

Definir `BOOKING_BACKEND=sheets` y redeploy. Sheets siguio recibiendo el espejo
de las escrituras, asi que no se pierde continuidad visible. Las citas creadas
solo en Postgres durante la ventana ya estaban espejadas; verificar la hoja
antes de volver.

## Limites conocidos de esta etapa

- El espejo a Sheets es best effort: si Sheets falla, la cita existe igual en
  Postgres (fuente de verdad) y el error queda en logs.
- Disponibilidad y excepciones siguen en Sheets: la generacion de slots lee
  citas desde Postgres pero bloques/bloqueos desde Sheets.
- El lock in-memory y el pre-check `isSlotTaken` se mantienen como capa de UX
  (respuesta rapida); la garantia real es la restriccion de exclusion.
