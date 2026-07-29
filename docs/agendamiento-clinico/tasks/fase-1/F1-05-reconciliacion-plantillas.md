# F1-05 · Reconciliación de plantillas y bandeja de conflictos

**Riesgo:** ALTO · **Depende de:** F1-04

## Objetivo

Que modificar una plantilla de agenda nunca deje pacientes huérfanos en silencio.

## Por qué importa

Es el escenario que genera la mayoría de los tickets de soporte en estos sistemas
y casi nunca se diseña de antemano. Un coordinador reduce el horario de un médico
y quedan 14 pacientes agendados en horas que ya no existen. Sin este ticket,
esos pacientes se enteran cuando llegan al centro.

## Contexto obligatorio

`reference/domain/reconcile-and-tests.ts` (función `reconcile`).

## Alcance

- `reconcile(template, existing, window, timezone): ReconcileResult` puro
- Clasificación del motivo del conflicto y sugerencia de alternativas cercanas
- Persistencia: crear, eliminar solo slots libres, marcar `conflicted` los ocupados
- Endpoint de **previsualización**: `POST /api/v1/schedule-templates/{id}/preview`
  que devuelve el impacto sin ejecutar nada
- Cola de resolución consultable por sede y profesional

## Criterios de aceptación

- [ ] Propiedad I-07: reconciliar nunca reduce el número de citas activas
- [ ] Ningún slot con `appointment_id` aparece jamás en `deleted`
- [ ] Matriz de casos cubierta: reducción de horario, cambio de duración,
      cambio de sede, eliminación de un día de la semana, adelanto de `valid_to`,
      desactivación de plantilla
- [ ] La previsualización reporta el conteo exacto: "afecta 212 citas de 187 pacientes"
- [ ] Los conflictos traen hasta 3 alternativas ordenadas por cercanía temporal
- [ ] Reconciliar es idempotente

## Invariantes

I-07

## Prompt sugerido

> Implementa el reconciliador según reference/domain/reconcile-and-tests.ts.
> Empieza por la prueba de propiedad I-07 y por la matriz de casos del ticket.
> El endpoint de previsualización no debe escribir nada en la base de datos:
> verifica esto con una prueba que cuente las escrituras.
