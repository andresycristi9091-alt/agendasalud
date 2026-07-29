# F1-02 · Esquema de base de datos y migraciones

**Riesgo:** ALTO · **Depende de:** F1-01 · **Bloquea:** casi todo

## Objetivo

Materializar el esquema completo del núcleo con sus restricciones de integridad,
y generar los tipos de Kysely a partir de él.

## Contexto obligatorio

Lee `reference/db/migrations/*.sql` **completo** antes de empezar. Ese es el diseño
de referencia, revisado. No lo reinterpretes: adáptalo si detectas un error real,
pero avisa explícitamente qué cambias y por qué.

Lee también `docs/adr/0002-postgres-exclusion-constraints.md` y `docs/invariantes.md`.

## Alcance

- Portar las 8 migraciones de referencia a `packages/db/migrations`
- `down` funcional y probado en cada una
- Generación de tipos Kysely (`kysely-codegen`) → `packages/db/src/schema.ts`
- Helper de transacción que fija el contexto RLS (`SET LOCAL app.*`)
- Seeds sintéticos: 3 sedes, 20 profesionales, 15 prestaciones, 500 pacientes ficticios.
  **Datos generados, nunca copiados de ninguna parte.**

## Criterios de aceptación

- [ ] `pnpm db:reset` reconstruye desde cero y aplica seeds sin error
- [ ] `pnpm db:down` revierte todas las migraciones hasta dejar la BD vacía
- [ ] Prueba de integración por cada restricción de exclusión:
      insertar el par solapado debe fallar con SQLSTATE `23P01`
- [ ] Prueba: `UPDATE` sobre `audit_log` con el rol `app_user` falla
- [ ] Prueba: insertar `location` con `timezone = 'GMT-4'` falla
- [ ] Prueba: cambiar `appointment.status` sin fila en `appointment_transition`
      falla al hacer COMMIT (constraint trigger diferido)
- [ ] Los tipos generados compilan y no contienen `any`

## Invariantes

I-01, I-02, I-03, I-05, I-06(a), I-09

## Advertencia

Este ticket define la forma del sistema. Un error aquí cuesta meses después.
Si algo del diseño de referencia no te cuadra, **pregunta antes de cambiarlo**.

## Prompt sugerido

> Lee reference/db/migrations/ completo, docs/invariantes.md y docs/adr/0002.
> Porta las migraciones a packages/db/migrations con dbmate. Antes de escribir,
> dime: (1) qué errores o inconsistencias detectas en el SQL de referencia,
> (2) cómo vas a probar cada restricción de exclusión. No escribas hasta que
> confirmemos ambos puntos.
