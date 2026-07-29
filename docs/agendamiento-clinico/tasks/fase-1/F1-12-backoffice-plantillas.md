# F1-12 · Backoffice — plantillas, bloqueos y bandeja de conflictos

**Riesgo:** Medio · **Depende de:** F1-10, F1-05

## Objetivo

Que un coordinador pueda configurar la oferta sin ayuda de ingeniería, y que
ninguna acción masiva se ejecute a ciegas.

## Alcance

- Editor de plantillas con previsualización del calendario resultante
- Gestión de bloqueos y ausencias, con flujo de aprobación
- **Previsualización de impacto obligatoria** antes de toda acción masiva:
  "esta acción afecta 212 citas de 187 pacientes"
- Bandeja de resolución de slots `conflicted` con alternativas sugeridas y
  comunicación al paciente redactada
- Gestión de ausencia imprevista: reasignación propuesta + comunicación masiva
- Editor de reglas de negocio con simulación obligatoria antes de encender
- Gestión de usuarios, roles y ámbitos
- Editor de plantillas de notificación con previsualización y control de costo

## Criterios de aceptación

- [ ] Ninguna acción masiva se ejecuta sin previsualización de impacto confirmada
- [ ] La confirmación muestra la consecuencia cuantificada, no un "¿estás seguro?"
- [ ] Encender una regla sin simulación previa está bloqueado en la UI y en la API
- [ ] La bandeja de conflictos permite resolver: reagendar, reasignar profesional,
      o mantener como excepción autorizada
- [ ] Resolver un conflicto genera notificación al paciente
- [ ] Toda acción de configuración queda en `audit_log` con `action='config_change'`
- [ ] `axe-core` en verde

## Prompt sugerido

> Implementa el backoffice. La previsualización de impacto es el requisito no
> negociable: ninguna acción masiva sin ella. Reutiliza el endpoint de preview
> de F1-05.
