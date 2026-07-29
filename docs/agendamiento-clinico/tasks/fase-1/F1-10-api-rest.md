# F1-10 · API REST v1

**Riesgo:** Medio · **Depende de:** F1-07, F1-09

## Objetivo

Exponer el núcleo con contratos estables, errores explicables y control de concurrencia.

## Alcance

- Endpoints: disponibilidad, holds, citas (crear, transicionar, reagendar),
  plantillas, bloqueos, pacientes, reglas
- Esquemas Zod en `packages/contracts` como fuente de verdad; OpenAPI generado desde ahí
- Errores en RFC 9457 con `humanMessage` localizado
- `ETag` / `If-Match` en actualizaciones
- Paginación por cursor
- Rate limiting: agresivo en búsqueda de pacientes (anti-enumeración) y en
  consulta de disponibilidad (anti-scraping)
- BFFs separados por audiencia: paciente, clínico, admin

## Criterios de aceptación

- [ ] OpenAPI generado, válido, y publicado en `/api/v1/openapi.json`
- [ ] Pruebas de contrato con Pact para los tres BFFs
- [ ] Ningún endpoint acepta datos de identificación en query string (I-11)
- [ ] IDs son UUIDv7; ningún endpoint expone identificadores secuenciales
- [ ] `GET /appointments/{id}` de otro paciente devuelve `404`, no `403`
      (no confirmar existencia)
- [ ] Actualización sin `If-Match` → `428`; con ETag obsoleto → `412`
- [ ] Todo error `4xx` incluye mensaje humano localizado
- [ ] Rate limit probado: 100 búsquedas por documento en 1 min activan bloqueo

## Invariantes

I-11, I-13

## Prompt sugerido

> Implementa la API v1. Define primero los esquemas Zod en packages/contracts y
> genera OpenAPI desde ahí — no al revés. Presta atención a la diferencia entre
> 404 y 403 en recursos de otros pacientes: nunca confirmar existencia.
