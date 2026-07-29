# F1-07 · Transacción de reserva

**Riesgo:** CRÍTICO · **Depende de:** F1-03, F1-06

## Objetivo

El corazón del sistema. Reservar una cita de forma correcta bajo contención,
con idempotencia y sin perder trazabilidad.

## Contexto obligatorio

`reference/domain/booking-transaction.ts` **completo**, más `docs/invariantes.md`.

## Alcance

- `POST /api/v1/holds` — toma de hold con TTL configurable
- `BookingService.book()` con las tres capas de defensa:
  hold optimista → `SELECT FOR UPDATE NOWAIT` → exclusion constraint
- `IdempotencyStore` con el protocolo de tres estados de la migración 006
- Asignación de recursos físicos respetando necesidades de accesibilidad del paciente
- Registro de consentimientos, transición, outbox y auditoría en la misma transacción
- Traducción de errores de dominio a Problem Details (RFC 9457)
- Búsqueda de alternativas cercanas en todo error de contención
- Job de liberación de holds vencidos cada 30 s

## Criterios de aceptación

- [ ] **500 reservas concurrentes sobre 50 slots → exactamente 50 citas.**
      Las 450 restantes fallan con `SlotTakenError`, ninguna con error inesperado.
- [ ] 50 requests en paralelo con la misma `Idempotency-Key` → 1 cita, mismo id
- [ ] Misma clave con cuerpo distinto → `422`
- [ ] Petición aún en curso con la misma clave → `409` con `Retry-After`
- [ ] Un hold vencido produce `410` con mensaje accionable, no `500`
- [ ] Todo error de contención devuelve al menos una alternativa cuando existe
- [ ] Prueba: si se comenta el `INSERT` a `appointment_transition`, la transacción
      falla al hacer COMMIT (verifica que el trigger diferido está activo)
- [ ] Prueba: si se comenta el `INSERT` a `outbox`, una prueba de integración lo detecta
- [ ] p95 de la operación completa < 300 ms con 100 usuarios concurrentes

## Invariantes

I-01, I-02, I-03, I-04, I-05, I-08

## Advertencia

No sustituyas ninguna de las tres capas de defensa por otra. En particular:
no reemplaces el `FOR UPDATE NOWAIT` por una comprobación previa de estado.
La comprobación previa no es atómica.

## Prompt sugerido

> Lee reference/domain/booking-transaction.ts y docs/invariantes.md completo.
> Implementa BookingService. Escribe PRIMERO la prueba de contención de 500 reservas
> sobre 50 slots con Testcontainers, y hazla fallar, antes de implementar.
> Dime tu plan antes de escribir.
