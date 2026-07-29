# F1-04 · Expansión de RRULE y materialización de slots

**Riesgo:** ALTO · **Depende de:** F1-02

## Objetivo

Convertir plantillas declarativas en slots concretos, correctamente, incluyendo
las transiciones de horario de verano.

## Contexto obligatorio

`reference/domain/reconcile-and-tests.ts` (función `expandTemplate`) y
`docs/adr/0003-materializacion-slots.md`.

## Alcance

- `expandTemplate(template, window, timezone): SlotDraft[]` en `packages/domain`
- Job en `apps/worker` que extiende la ventana móvil de 180 días diariamente
- Aplicación de `schedule_block` (bloqueos) al materializar
- Escritura por lotes con `ON CONFLICT DO NOTHING` para ser reejecutable
- Métrica: slots generados, tiempo de ejecución, ventana cubierta por profesional

## Criterios de aceptación

- [ ] Propiedad I-06: para las zonas `America/Santiago`, `America/Sao_Paulo`,
      `Europe/Madrid`, `Australia/Sydney`, `Pacific/Auckland`, un bloque definido
      a las 09:00 locales empieza a las 09:00 locales **antes y después** del
      cambio de horario de verano
- [ ] En la transición donde se adelanta el reloj, no se generan slots en la hora
      inexistente
- [ ] En la transición donde se atrasa, no se generan slots duplicados
- [ ] El job es idempotente: ejecutarlo 5 veces produce el mismo resultado
- [ ] Un bloqueo que cubre parcialmente un slot lo marca `blocked` completo
      (no se generan medios slots)
- [ ] Materializar 200 profesionales × 180 días toma menos de 60 s

## Invariantes

I-06

## Trampa conocida

Expandir la recurrencia en UTC y convertir después a local. Es la causa del
bug de "las horas se corrieron una hora" que aparece dos veces al año.
La expansión va en hora local; la conversión a instante ocurre al final.

## Prompt sugerido

> Implementa expandTemplate y el job de materialización. Usa Temporal (polyfill),
> no Date ni date-fns, para el manejo de zonas horarias. Escribe primero las
> pruebas de propiedades de DST del ticket, incluyendo las zonas del hemisferio sur.
