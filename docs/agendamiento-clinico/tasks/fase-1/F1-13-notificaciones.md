# F1-13 · Notificaciones base

**Riesgo:** Medio · **Depende de:** F1-08

## Objetivo

Recordatorios confiables, sin duplicados, sin riesgo de tormenta de envíos.

## Alcance

- Planificador que consume eventos y programa la cadencia:
  7 días antes (informativo), 48 h (con confirmar/reagendar/cancelar), 3 h (logístico)
- Worker de envío con abstracción de proveedor (SMS, email, WhatsApp, push)
- Escalamiento de canal ante fallo: SMS → WhatsApp → email → gestión manual
- Webhooks de estado de entrega
- Respuestas entrantes: el paciente responde "1" y se confirma la cita más próxima
  pendiente; si hay ambigüedad, se pide desambiguación
- Cancelación en cascada: cancelar una cita cancela sus notificaciones futuras
- Horas de silencio configurables
- Presupuesto por sede con **corte duro**, no solo alerta

## Criterios de aceptación

- [ ] Reprocesar el mismo evento 10 veces → 1 notificación (I-12)
- [ ] Cancelar una cita → 0 notificaciones pendientes para esa cita
- [ ] Reagendar → las notificaciones viejas se cancelan y se programan las nuevas
- [ ] Superado el presupuesto de la sede, el worker deja de enviar y alerta
- [ ] Rate limit duro a nivel de worker, independiente del límite del proveedor
- [ ] Ningún envío entre las horas de silencio configuradas
- [ ] Una respuesta "1" desde un número asociado a dos citas pendientes pide
      desambiguación en vez de adivinar
- [ ] Prueba de regresión: un despliegue reejecutado no reenvía nada

## Invariantes

I-12

## Advertencia

Un bug en el planificador puede generar decenas de miles de SMS en minutos.
El `dedup_key` y el corte por presupuesto son mitigaciones obligatorias, no opcionales.

## Prompt sugerido

> Implementa el subsistema de notificaciones. Empieza por la prueba de idempotencia
> y por el corte de presupuesto. Quiero ver la prueba que demuestra que reejecutar
> un despliegue no reenvía nada antes de que implementes el envío real.
