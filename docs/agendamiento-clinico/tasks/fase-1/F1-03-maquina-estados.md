# F1-03 · Máquina de estados de cita

**Riesgo:** ALTO · **Depende de:** F1-02

## Objetivo

Implementar en `packages/domain` la máquina de estados de `appointment` como
lógica pura, sin I/O, con pruebas de propiedades.

## Alcance

- Tipo `AppointmentStatus` y tabla de transiciones válidas (espejo de
  `status_transition_rule`, con prueba que verifica que **no divergen**)
- `canTransition(from, to, actorRole): TransitionCheck`
- Efectos derivados de cada transición (qué eventos emite, qué campos toca)
- Reglas temporales: `noshow` solo tras la ventana de gracia configurable;
  `arrived` no más de N minutos antes del inicio
- Reconstrucción del estado a partir del historial de transiciones

**Fuera de alcance:** persistencia. Esto es una función pura.

## Criterios de aceptación

- [ ] Propiedad: desde un estado terminal (`fulfilled`, `cancelled`, `noshow`)
      ninguna transición es válida
- [ ] Propiedad: el estado actual siempre es reconstruible replicando el historial
- [ ] Propiedad: toda transición válida tiene al menos un rol autorizado
- [ ] Prueba de coherencia: la tabla en TypeScript y la tabla en BD son idénticas
      (la prueba consulta `status_transition_rule` y compara)
- [ ] Transiciones que requieren motivo lo exigen en el nivel de tipos, no en runtime
- [ ] 100 % de cobertura de ramas en el módulo

## Invariantes

I-05

## Prompt sugerido

> Implementa la máquina de estados en packages/domain/src/appointment/state-machine.ts.
> Lógica pura, sin imports de packages/db. Escribe primero las pruebas de propiedades
> con fast-check listadas en el ticket. La tabla de transiciones debe ser la única
> fuente de verdad en el código: nada de if/else sobre estados en otros archivos.
