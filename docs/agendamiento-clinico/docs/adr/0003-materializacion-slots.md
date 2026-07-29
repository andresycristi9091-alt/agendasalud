# ADR 0003 · Materialización de slots en ventana móvil

**Estado:** Aceptado · **Fecha:** 2026-07

## Contexto

Hay dos formas de responder "¿qué horas hay disponibles?":

**A. Cálculo al vuelo.** Guardar plantillas (RRULE) y expandirlas en cada consulta,
restando bloqueos y citas.

**B. Materialización.** Un job genera filas concretas en `slot`.

## Decisión

Híbrido, con la materialización como fuente de verdad operacional:
- Plantillas como definición declarativa
- Ventana móvil de **180 días** materializada, extendida diariamente
- Modificar una plantilla recalcula solo el rango afectado, mediante reconciliación

## Justificación

El cálculo al vuelo es elegante pero no escala a la consulta que más importa:
"primera hora disponible entre 40 profesionales de 6 sedes". Y sobre todo, **no
permite aplicar restricciones de integridad a nivel de motor** (ver ADR 0002),
porque no hay filas sobre las que aplicarlas.

La materialización además deja rastro auditable de exactamente qué se ofreció y cuándo.

## El caso difícil

Modificar una plantilla cuando ya hay citas agendadas en horarios que la nueva
plantilla no contempla. La respuesta **nunca** es borrar:

```
regenerar(plantilla, desde, hasta):
  deseados = expandir_RRULE(plantilla, desde, hasta)
  actuales = slots_de(plantilla, desde, hasta)

  crear(deseados − actuales)
  eliminar(actuales − deseados  donde  appointment_id IS NULL)
  marcar_conflicto(actuales − deseados  donde  appointment_id IS NOT NULL)
```

Los slots `conflicted` van a una bandeja de resolución humana. Este escenario genera
la mayoría de los tickets de soporte en sistemas de agendamiento y casi nunca se
diseña de antemano.

## Consecuencias

- ✅ Consultas de disponibilidad triviales e indexables
- ✅ Habilita las restricciones de exclusión
- ✅ Auditable
- ❌ ~720 000 filas para 200 profesionales × 180 días (manejable)
- ❌ Requiere el reconciliador y su bandeja de conflictos como parte del núcleo,
  no como un extra posterior
