# Plataforma de Agendamiento Clínico

Repositorio de arranque para desarrollar con **Claude Code**.
Contiene contexto, decisiones, diseño de referencia y tickets de trabajo.
Todavía no contiene código de aplicación: el primer ticket lo crea.

## Empezar

```bash
# 1. Copia este bundle a tu repositorio vacío
git init && git add . && git commit -m "chore: contexto y tickets iniciales"

# 2. Abre Claude Code en la raíz (lee CLAUDE.md automáticamente)
claude

# 3. Primer ticket
> Lee tasks/fase-1/F1-01-scaffold-monorepo.md y CLAUDE.md.
> Dime tu plan y tus dudas antes de escribir nada.
```

## Mapa del repositorio

```
CLAUDE.md                 ★ Contexto permanente. Claude Code lo lee en cada sesión.
                            Stack, comandos, invariantes, convenciones, qué NO hacer.

docs/
  invariantes.md          ★ Las 13 reglas que no se rompen, con su prueba asociada.
  00-alcance-funcional.md   Qué debe hacer el sistema, por rol, con criterio de diseño.
  01-arquitectura-tecnica.md Arquitectura extendida: escala, seguridad, operación.
  adr/                      Decisiones con su justificación y su alternativa descartada.

reference/
  db/migrations/*.sql     ★ Esquema completo con las restricciones de integridad.
                            Diseño revisado — no reinterpretar sin avisar.
  domain/*.ts               Implementaciones de referencia de las partes difíciles:
                            transacción de reserva, reconciliación, pruebas de propiedades.

tasks/
  README.md                 Cómo trabajar los tickets con Claude Code.
  fase-1/                   14 tickets del núcleo. Ordenados por riesgo, no por visibilidad.
  fase-2/, fase-3/          Backlog de autogestión del paciente e inteligencia operacional.
```

## Los cuatro archivos que hay que leer sí o sí

1. `CLAUDE.md` — antes de cualquier sesión
2. `docs/invariantes.md` — antes de tocar dominio o base de datos
3. `reference/db/migrations/` — antes del ticket F1-02
4. `reference/domain/booking-transaction.ts` — antes del ticket F1-07

## Orden de trabajo

El criterio es **riesgo técnico, no visibilidad**. Lo caro de cambiar va primero:

1. Modelo de datos y restricciones de exclusión
2. Materialización de slots con reconciliación
3. Transacción de reserva con holds e idempotencia
4. Motor de reglas con simulación
5. Outbox y auditoría

La interfaz bonita puede esperar. Un sistema de agendamiento con un modelo de
concurrencia débil no se arregla con rediseño.

## Antes de empezar: cuatro decisiones que este bundle asume

Revísalas y ajusta el contexto si tu situación es distinta:

| Supuesto | Dónde cambiarlo si no aplica |
|---|---|
| Stack TypeScript/NestJS/PostgreSQL | `CLAUDE.md` § Stack |
| Sin ficha clínica electrónica preexistente | `tasks/fase-3/backlog.md` F3-01, F3-02 |
| Jurisdicción sin definir (normativa genérica) | `docs/01-arquitectura-tecnica.md` § 8.3 |
| Centro ambulatorio, no hospitalario | Todo el alcance funcional |

PostgreSQL es el único elemento que el diseño trata como no sustituible.
La razón está en `docs/adr/0002`.
