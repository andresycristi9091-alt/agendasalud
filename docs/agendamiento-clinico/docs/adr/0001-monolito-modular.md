# ADR 0001 · Monolito modular en vez de microservicios

**Estado:** Aceptado · **Fecha:** 2026-07

## Contexto

El sistema tiene contextos delimitados claros (identidad, oferta de agenda, reserva,
reglas, notificaciones, analítica) y la tentación natural es separarlos en servicios.

## Decisión

Monolito modular desplegable como una unidad, con módulos separados por bounded
context y comunicación interna por interfaces explícitas.

Se extraen desde el día uno solo cuatro componentes, y por razones concretas:

| Servicio | Razón |
|---|---|
| Notificaciones | Carga en ráfagas, latencia tolerante, proveedores externos inestables |
| Telemedicina | Perfil de infraestructura distinto (media servers, TURN/STUN) |
| Analítica | Cargas de lectura pesadas que no deben competir con el OLTP |
| Gateway FHIR | Superficie pública versionada con ciclo de vida propio |

## Justificación

Reservar una cita toca simultáneamente slot, cita, recurso, reglas, transición,
outbox y auditoría. Con una transacción ACID eso se resuelve en milisegundos y con
garantía total. Repartido entre microservicios exige sagas y compensaciones para
resolver un problema que la base de datos ya resuelve.

La mayoría de los proyectos de salud que fracasan técnicamente lo hacen por aplicar
consistencia eventual al núcleo de reservas. El resultado son cupos duplicados que
nadie sabe explicar.

## Consecuencias

- ✅ Correctitud transaccional gratuita en el núcleo
- ✅ Desarrollo y depuración mucho más simples
- ✅ Una sola migración de base de datos que razonar
- ❌ Escalamiento horizontal menos granular (aceptable: el cuello de botella es la BD)
- ❌ Requiere disciplina en la regla de dependencias entre módulos —
  se aplica con lint, no con buenas intenciones

## Cuándo revisar

Si un módulo necesita escalar 10× más que el resto, o si un equipo separado
necesita ciclo de despliegue independiente. No antes.
