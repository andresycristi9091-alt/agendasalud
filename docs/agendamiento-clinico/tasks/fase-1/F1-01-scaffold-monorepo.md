# F1-01 · Scaffold del monorepo

**Riesgo:** Bajo · **Depende de:** — · **Bloquea:** todo

## Objetivo

Dejar el repositorio en un estado donde `pnpm dev` levanta Postgres, Redis y la API
en blanco, y `pnpm test` corre en verde con una prueba trivial. Nada de lógica de negocio.

## Alcance

**Incluye**
- pnpm workspace + Turborepo con la estructura de `CLAUDE.md`
- `apps/api` (NestJS), `apps/worker`, `packages/domain`, `packages/db`,
  `packages/contracts`, `packages/telemetry` — todos con su `package.json`,
  `tsconfig.json` y un export mínimo
- `docker-compose.yml` con `postgres:16` (con `btree_gist` disponible) y `redis:7`
- ESLint + Prettier + `tsconfig` base con `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`
- Vitest configurado con proyectos separados: `unit` e `integration` (Testcontainers)
- dbmate configurado apuntando a `packages/db/migrations`
- Scripts de `CLAUDE.md` funcionando
- CI en GitHub Actions: lint, typecheck, test, test:integration

**No incluye:** ninguna tabla, ningún endpoint, ningún componente de UI.

## Criterios de aceptación

- [ ] `pnpm install && pnpm dev` levanta todo sin errores
- [ ] `pnpm db:up` conecta y aplica una migración vacía de prueba
- [ ] `pnpm test` y `pnpm test:integration` pasan (con una prueba dummy cada uno)
- [ ] `pnpm typecheck` en verde con `strict: true`
- [ ] Regla de lint que **falla** si `packages/domain` importa de `packages/db`
      (usar `eslint-plugin-boundaries` o equivalente)
- [ ] Regla de lint que prohíbe `timestamp without time zone` en archivos `.sql`
- [ ] CI verde en un PR de prueba

## Invariantes que habilita

Ninguno directamente, pero la regla de dependencias de `packages/domain` es lo que
hace posible que las pruebas de propiedades corran sin base de datos.

## Prompt sugerido

> Lee CLAUDE.md. Crea el scaffold del monorepo según la estructura descrita, con el
> stack indicado. No implementes lógica de negocio ni tablas. Dame primero la lista
> de archivos que vas a crear y las versiones exactas de las dependencias, para revisar
> antes de que escribas nada.
