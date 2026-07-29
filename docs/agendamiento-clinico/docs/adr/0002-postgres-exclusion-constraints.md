# ADR 0002 · PostgreSQL con restricciones de exclusión como garantía de integridad

**Estado:** Aceptado · **Fecha:** 2026-07

## Contexto

El invariante más importante del sistema es que dos citas activas no se solapen.
Hay dos formas de garantizarlo: validación en la aplicación, o restricción en el motor.

## Decisión

La garantía vive en PostgreSQL, mediante `EXCLUDE USING gist` sobre `tstzrange`,
habilitado por la extensión `btree_gist`.

```sql
CONSTRAINT slot_no_overlap EXCLUDE USING gist (
  practitioner_id WITH =,
  period          WITH &&
) WHERE (status <> 'blocked' AND overbook = false)
```

Esto convierte a PostgreSQL en una dependencia **no sustituible** del proyecto.
El resto del stack es reemplazable; esto no.

## Justificación

Una validación en aplicación es un `SELECT` seguido de un `INSERT`. Entre ambos hay
una ventana en la que otra transacción puede insertar. Bajo contención real —que en
este dominio es el caso normal, no el excepcional— esa ventana se materializa.

La restricción de exclusión sobrevive a: bugs de aplicación, condiciones de carrera,
scripts de migración mal escritos, y acceso directo a la base de datos.

## Consecuencia importante: no se puede particionar

PostgreSQL 16 **no admite restricciones EXCLUDE sobre tablas particionadas**.
Como la garantía vale más que una optimización para un volumen que aún no existe,
`appointment` y `slot` no se particionan.

Revisar recién por encima de ~50M filas. A esa altura la alternativa correcta es
archivar el histórico a una tabla fría, no particionar la caliente.

## Consecuencias

- ✅ Imposible tener doble reserva, sin importar los bugs de aplicación
- ✅ La prueba de contención (500 reservas / 50 slots) pasa por construcción
- ❌ Acopla el proyecto a PostgreSQL
- ❌ Sin particionamiento en las tablas calientes
- ❌ Los errores llegan como SQLSTATE `23P01` y hay que traducirlos a mensajes humanos
