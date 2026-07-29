# F1-11 · Consola clínica — agenda del día

**Riesgo:** Medio · **Depende de:** F1-10

## Objetivo

La herramienta que el profesional usa entre pacientes, con 30 segundos de atención
disponible, muchas veces de pie.

## Principio de diseño

**No es una versión más grande del portal del paciente.** Densidad alta, lectura
de un vistazo, acciones de un clic. El clínico debe ver la *forma* del día,
no leer una lista.

## Alcance

- Vista timeline con bloques proporcionales a la duración (día, semana, lista móvil)
- Estado codificado con color **+ icono + texto** — nunca solo color
- Tarjeta de cita con contexto: primera vez/control, edad, previsión,
  alertas clínicas, necesidades de accesibilidad, adjuntos pendientes
- Panel lateral de vista previa del paciente sin salir de la agenda
- Acciones: marcar llegada, iniciar, cerrar, marcar inasistencia, agendar próximo control
- Contador en vivo: pacientes esperando, atraso acumulado
- Atajos de teclado para las 5 acciones más frecuentes, con ayuda en `?`
- **Offline**: Service Worker + IndexedDB, cola de mutaciones, resolución de
  conflictos explícita (nunca "el último gana" en datos clínicos)
- Modo oscuro y tamaño de texto ajustable

## Criterios de aceptación

- [ ] `axe-core` sin violaciones A/AA en E2E
- [ ] Navegación completa por teclado con foco visible
- [ ] Ningún estado se comunica solo por color (prueba con simulación de daltonismo)
- [ ] Con la red caída: la agenda del día sigue visible y las acciones se encolan
- [ ] Al recuperar red, un conflicto de estado muestra ambas versiones y pide decisión
- [ ] Indicador de sincronización siempre visible con contador de pendientes
- [ ] Estados de carga, vacío, error y sin conexión implementados en toda vista
- [ ] Agendar el próximo control se hace sin salir de la pantalla de cierre

## Prompt sugerido

> Implementa la consola clínica. Lee docs/00-alcance-funcional.md sección 2.
> Prioriza la vista timeline y el offline por sobre lo demás. Usa packages/ui.
> Antes de codificar, muéstrame cómo vas a resolver la resolución de conflictos
> al reconectar.
