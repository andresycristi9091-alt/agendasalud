# Tickets de trabajo

## Cómo usar esto con Claude Code

Cada ticket está dimensionado para **una sesión de trabajo enfocada**: alcance
acotado, criterios de aceptación verificables y pruebas definidas antes de empezar.

### Flujo por ticket

```bash
# 1. Abre Claude Code en la raíz del repo (lee CLAUDE.md automáticamente)
claude

# 2. Dale el ticket como contexto de la sesión
> Lee tasks/fase-1/F1-07-transaccion-reserva.md y docs/invariantes.md.
> Antes de escribir código, dime tu plan y qué dudas tienes sobre el alcance.

# 3. Revisa el plan, corrige, y recién ahí:
> Implementa. Escribe primero las pruebas de los criterios de aceptación.
```

### Reglas de la casa

- **Un ticket por rama.** `feat/F1-07-transaccion-reserva`
- **Plan antes de código** en todo ticket que toque `packages/domain`, migraciones
  o autorización. Si Claude empieza a escribir sin plan, detenlo.
- **Las pruebas primero** cuando el ticket lista invariantes. No son negociables.
- **Si Claude propone romper una regla de `CLAUDE.md`**, es señal de que el ticket
  está mal especificado. Arregla el ticket, no la regla.

### Contexto que conviene tener abierto

Para tickets de dominio: `docs/invariantes.md` + `reference/domain/*`
Para tickets de datos: `reference/db/migrations/*` + el ADR correspondiente
Para tickets de frontend: `docs/00-alcance-funcional.md` (secciones del rol)

### Verificación antes de cerrar

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration
```

Y una revisión humana de: migraciones, cambios en restricciones de exclusión,
autorización y plantillas de notificación. Esos cuatro no se aprueban por inercia.

---

## Orden recomendado

El criterio de orden es **riesgo técnico, no visibilidad**. Lo caro de cambiar va primero.

### Fase 1 — Núcleo (meses 1–4)
Objetivo: reemplazar la agenda en papel o Excel. Sin portal de paciente todavía.

| # | Ticket | Depende de | Riesgo |
|---|---|---|---|
| F1-01 | Scaffold del monorepo | — | Bajo |
| F1-02 | Esquema de BD y migraciones | F1-01 | **Alto** |
| F1-03 | Máquina de estados de cita | F1-02 | **Alto** |
| F1-04 | RRULE y materialización de slots | F1-02 | **Alto** |
| F1-05 | Reconciliación de plantillas | F1-04 | **Alto** |
| F1-06 | Motor de reglas y simulación | F1-02 | Medio |
| F1-07 | Transacción de reserva | F1-03, F1-06 | **Crítico** |
| F1-08 | Outbox y publicador | F1-02 | Medio |
| F1-09 | Autorización, RLS y auditoría | F1-02 | **Alto** |
| F1-10 | API REST v1 | F1-07, F1-09 | Medio |
| F1-11 | Consola clínica — agenda del día | F1-10 | Medio |
| F1-12 | Backoffice — plantillas y conflictos | F1-10, F1-05 | Medio |
| F1-13 | Notificaciones base | F1-08 | Medio |
| F1-14 | Observabilidad y pruebas de carga | F1-10 | Medio |

### Fase 2 — Autogestión del paciente (meses 4–8)
Ver `tasks/fase-2/backlog.md`

### Fase 3 — Inteligencia operacional (meses 8–12)
Ver `tasks/fase-3/backlog.md`

---

## Definición de terminado

Un ticket está terminado cuando:

- [ ] Todos los criterios de aceptación tienen prueba automatizada que pasa
- [ ] Los invariantes listados tienen su prueba correspondiente en verde
- [ ] `lint`, `typecheck`, `test` y `test:integration` pasan
- [ ] Las migraciones tienen `down` probado (`db:reset` funciona)
- [ ] No hay `any`, `TODO` ni `console.log` sin justificar
- [ ] El PR documenta: invariantes tocados, migraciones incluidas, cómo revertir
- [ ] Si toca UI: `axe-core` en verde y estados vacío/carga/error/offline implementados
