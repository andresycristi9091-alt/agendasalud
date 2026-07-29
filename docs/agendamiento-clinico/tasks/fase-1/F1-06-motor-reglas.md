# F1-06 · Motor de reglas configurable y simulación

**Riesgo:** Medio · **Depende de:** F1-02

## Objetivo

Que las reglas de negocio se cambien desde el backoffice, sin desplegar código,
y que se puedan simular contra tráfico real antes de encenderlas.

## Alcance

- Evaluador determinista de JsonLogic sobre `RuleContext`, sin I/O ni red
- Carga y caché de reglas activas con invalidación por evento
- Evaluación en dos fases con la **misma** implementación:
  `availability` (filtrar lo que no se debe mostrar) y `booking` (validar al confirmar)
- Simulador: ejecuta una regla contra los últimos N días de `appointment_transition`
  y reporta cuántas reservas habría bloqueado, con muestra de casos
- Toda regla se crea con `enabled = false`. Encenderla requiere una simulación previa
  registrada en `rule_simulation`.

## Criterios de aceptación

- [ ] El evaluador es puro: prueba que falla si el módulo importa algo con I/O
- [ ] Prueba de contrato: toda regla con `effect='deny'` tiene mensaje en todos los
      idiomas soportados (I-08)
- [ ] Las reglas de ejemplo del catálogo inicial funcionan: antelación mínima y máxima,
      ventana de cancelación, máximo de citas activas, política de no-show,
      prestación que requiere derivación
- [ ] Encender una regla sin simulación previa es rechazado por la API
- [ ] La simulación no modifica ningún dato
- [ ] Una denegación devuelve `ruleId`, mensaje localizado y remediación cuando existe
- [ ] Evaluar 50 reglas sobre 1000 slots toma menos de 100 ms

## Invariantes

I-08

## Regla de diseño

Nada de lenguajes Turing-completos expuestos a usuarios administrativos.
JsonLogic o CEL. Si el evaluador puede no terminar, está mal.

## Prompt sugerido

> Implementa el motor de reglas en packages/domain/src/rules/. Debe ser puro y
> determinista. Diseña primero el tipo RuleDecision de forma que sea imposible
> construir una denegación sin mensaje humano — quiero que el compilador lo garantice,
> no una validación en runtime.
