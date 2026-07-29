# F1-08 · Outbox transaccional y publicador de eventos

**Riesgo:** Medio · **Depende de:** F1-02

## Objetivo

Publicar eventos de dominio de forma confiable sin acoplar la transacción de
negocio a la disponibilidad del bus.

## Alcance

- Publicador en `apps/worker`: lee con `FOR UPDATE SKIP LOCKED`, publica a
  Redis Streams, marca `published_at`
- Reintento con backoff exponencial y cola de veneno tras N fallos
- Consumidores idempotentes usando `processed_event`
- Propagación de `trace_id` de OpenTelemetry a través del evento
- Catálogo de eventos tipado en `packages/contracts`, versionado
- Métrica de frescura del outbox (edad del evento pendiente más antiguo)

## Criterios de aceptación

- [ ] Ningún `publish()` ocurre dentro de una transacción de negocio (regla de lint)
- [ ] Reprocesar el mismo evento 10 veces produce un solo efecto en cada consumidor
- [ ] Con el bus caído, las reservas siguen funcionando y el backlog se drena al volver
- [ ] Prueba de caos: matar el publicador a mitad de un lote no pierde ni duplica eventos
- [ ] Alerta configurada: frescura del outbox p99 > 30 s
- [ ] El orden por agregado se preserva (eventos de la misma cita llegan en orden)

## Prompt sugerido

> Implementa el outbox publisher en apps/worker. Usa FOR UPDATE SKIP LOCKED.
> Incluye la prueba de caos: mata el proceso a mitad de lote y verifica que
> no hay pérdida ni duplicación.
