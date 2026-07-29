# ADR 0004 · Reglas de negocio en datos, no en código

**Estado:** Aceptado · **Fecha:** 2026-07

## Contexto

Cada centro de salud tiene reglas distintas (antelación mínima, ventana de
cancelación, política de no-show, qué prestaciones requieren derivación) y las
cambia cada pocos meses.

## Decisión

Las reglas se almacenan en `business_rule` como JsonLogic, con versionado,
vigencia y simulación obligatoria antes de activarse. El evaluador es puro,
determinista y sin acceso a red.

Toda regla nace con `enabled = false`. Encenderla requiere una simulación previa
registrada contra tráfico histórico.

## Justificación

Si cambiar una regla requiere un despliegue, ocurren dos cosas: el centro deja de
poder operar a su ritmo, y el equipo de ingeniería se convierte en un cuello de
botella para decisiones administrativas.

La simulación existe porque activar una regla mal calibrada un viernes puede dejar
al centro sin poder agendar. Poder responder "esta regla habría bloqueado 340 de
las 1200 reservas del último mes" antes de encenderla evita ese escenario.

## Restricciones

- **Nada Turing-completo expuesto a usuarios administrativos.** JsonLogic o CEL.
  Si el evaluador puede no terminar, está mal diseñado.
- **Toda denegación trae mensaje humano localizado**, garantizado en el nivel de tipos.
  Un 403 sin explicación es un ticket de soporte garantizado.
- La misma implementación evalúa en fase `availability` y en fase `booking`.
  Duplicar la lógica en dos lugares es cómo aparecen las inconsistencias donde el
  sistema ofrece una hora y luego la rechaza.

## Consecuencias

- ✅ El centro configura su operación sin ingeniería
- ✅ Cambios reversibles y auditados
- ❌ Menos expresivo que código
- ❌ Requiere herramientas propias: editor, simulador, historial de versiones
