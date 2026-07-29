# F1-14 · Observabilidad, SLOs y pruebas de carga

**Riesgo:** Medio · **Depende de:** F1-10

## Objetivo

Saber que el sistema funciona en términos de negocio, no solo de infraestructura.

## Alcance

- OpenTelemetry: trazas, métricas y logs correlacionados, con redacción de PII
- SLOs instrumentados y con alerta:
  - Disponibilidad API de reserva: 99,9 % mensual
  - Latencia de consulta de disponibilidad: p95 < 400 ms
  - Latencia de confirmación de reserva: p95 < 800 ms
  - Entrega de recordatorio: 99 % dentro de ±15 min
  - Frescura del outbox: p99 < 30 s
- **Alertas de resultado de negocio**, no solo técnicas:
  - Tasa de `SLOT_TAKEN` sobre el basal
  - Slots `conflicted` sin resolver sobre umbral
  - Caída de la tasa de confirmación de pacientes
  - **Cero reservas en una sede durante horario hábil**
- Pruebas de carga en k6 con tres perfiles:
  1. Apertura de agenda: 500 usuarios sobre 50 slots (contención pura)
  2. Lunes 08:00–10:00: pico general sostenido
  3. Envío masivo: 20 000 mensajes en 10 min + tráfico entrante de clics

## Criterios de aceptación

- [ ] Los tres perfiles de carga corren en CI nocturno con umbrales que fallan el build
- [ ] Perfil 1: p99 de la reserva < 500 ms, 0 duplicados, 0 errores inesperados
- [ ] Prueba de la alerta "cero reservas": simulada y verificada que dispara
- [ ] Ninguna traza, log ni métrica contiene datos personales (prueba automatizada)
- [ ] Runbook por cada alerta, enlazado desde la alerta misma

## Invariantes

I-11

## Nota

La alerta de "cero reservas en horario hábil" es la que detecta las fallas que
ningún dashboard técnico muestra: el sistema puede estar 100 % verde mientras
nadie logra agendar.

## Prompt sugerido

> Implementa observabilidad y pruebas de carga. Prioriza el perfil 1 (contención)
> porque es el que rompe sistemas. Configura la redacción de PII en el pipeline
> de logging antes que cualquier otra cosa.
