# Sistema de Agendamiento de Citas Clínicas
### Especificación funcional y de experiencia para Pacientes, Usuarios Clínicos y Administración

---

## 0. Principios de diseño transversales

Antes de listar funcionalidades, conviene fijar los principios que ordenan las decisiones cuando hay conflicto entre roles. En un sistema de agendamiento casi siempre hay tensión: lo que le conviene al paciente (máxima flexibilidad para cambiar la hora) le complica la vida al clínico (agenda inestable) y al centro (huecos improductivos). Los principios son el criterio de desempate.

**1. Un solo estado de verdad, muchos canales.** El paciente puede agendar por web, app, WhatsApp, call center o mesón presencial. Todos escriben sobre la misma agenda en tiempo real. La regla dura: nunca debe existir una hora que un canal cree disponible y otro no.

**2. La ruta feliz en tres decisiones.** Un paciente que sabe lo que necesita debería llegar a "cita confirmada" respondiendo tres preguntas: qué necesito, con quién/dónde, cuándo. Todo lo demás (previsión, motivo, documentos) se pide después de asegurar el cupo, no antes. Pedir datos antes de mostrar valor es la causa número uno de abandono.

**3. Diseñar para el peor usuario, no para el promedio.** El usuario real es un adulto mayor con presbicia usando un teléfono prestado con datos móviles lentos, o un familiar agendando por otra persona. Si funciona para él, funciona para todos. Esto no es caridad: en salud pública ese perfil es la mayoría.

**4. Accesibilidad como requisito, no como fase final.** WCAG 2.2 nivel AA como mínimo contractual: contraste 4.5:1, áreas táctiles ≥ 44×44 px, navegación completa por teclado, foco visible, compatibilidad con lectores de pantalla, sin dependencia exclusiva del color para transmitir estado.

**5. Densidad asimétrica.** El paciente necesita interfaces amplias, guiadas y de una tarea a la vez. El clínico y el administrador necesitan densidad alta, atajos e información simultánea. Son productos distintos que comparten backend; diseñarlos con el mismo sistema visual pero no con la misma métrica de espaciado.

**6. Diseñar para el error y el arrepentimiento.** Toda acción destructiva (cancelar, liberar agenda, eliminar bloqueo) necesita confirmación con consecuencia explícita ("se liberarán 14 horas ya reservadas y se notificará a 14 pacientes") y, cuando sea técnicamente posible, deshacer.

**7. Confianza visible.** El paciente entrega datos de salud. La interfaz debe comunicar quién ve qué, por qué se pide cada dato y cómo se protege, sin muros de texto legal. Un microtexto bajo el campo "motivo de consulta" que diga "solo lo verá el profesional que te atienda" cambia la tasa de completitud.

**8. Rendimiento percibido.** Un calendario que tarda 4 segundos en cargar disponibilidad se percibe como "no hay horas". Uso de esqueletos de carga, prefetch de los próximos días y renderizado optimista con reversión ante error.

---

## 1. Módulo Paciente

### 1.1 Identificación y acceso

- **Registro mínimo viable**: documento de identidad, fecha de nacimiento, teléfono móvil, correo. Nada más en el primer contacto.
- **Verificación de identidad** por OTP a móvil o correo. Considerar integración con identidad digital estatal si existe en el país (ClaveÚnica, Cl@ve, gov.br, etc.).
- **Agendamiento como invitado**: permitir reservar sin crear cuenta y ofrecer crearla al final, ya con los datos precargados. Reduce abandono de forma significativa.
- **Recuperación de acceso sin fricción**: enlace mágico por correo o SMS en vez de preguntas de seguridad.
- **Gestión de terceros a cargo**: perfiles vinculados para hijos, adultos mayores o personas con discapacidad, con consentimiento registrado y trazabilidad de quién agendó por quién. Esto es un requisito, no un extra: gran parte de las horas las agenda un familiar.
- **Perfil de accesibilidad opcional**: requiere intérprete de lengua de señas, silla de ruedas, acompañante, idioma preferente, box en primer piso. Debe propagarse a la vista del clínico y a la del personal de admisión.

### 1.2 Búsqueda y descubrimiento de la hora

Este es el corazón de la experiencia. Tres puntos de entrada distintos porque hay tres mentalidades:

| Entrada | Mentalidad del paciente | Diseño |
|---|---|---|
| Por especialidad / prestación | "Necesito un dermatólogo" | Buscador con autocompletado que acepta lenguaje coloquial ("dolor de muela" → Odontología) |
| Por profesional | "Quiero con la Dra. Rojas" | Ficha del profesional con próximas horas embebidas |
| Por urgencia / primera hora | "Lo antes posible" | Vista "primeras horas disponibles" ordenada por fecha, sin filtros previos |

**Filtros que importan de verdad:**
- Modalidad: presencial / telemedicina / domiciliaria
- Sede y distancia (con mapa y tiempo estimado de traslado)
- Previsión, seguro o convenio, con **precio estimado visible antes de reservar**
- Rango horario preferido (mañana / tarde / después de las 18:00 / sábados)
- Idioma del profesional, género del profesional (relevante en ginecología, salud mental, salud sexual)
- Profesional que ya me ha atendido antes (continuidad de cuidado)

**Diseño del selector de horas:**
- Nunca mostrar un calendario vacío. Si no hay disponibilidad en el mes visible, saltar automáticamente al primer día con cupo y decirlo: "La primera hora disponible es el 12 de agosto".
- Agrupar bloques por franja (Mañana / Tarde / Noche) en lugar de una grilla de 40 botones idénticos.
- Mostrar duración estimada de la atención y hora de llegada sugerida.
- **Bloqueo temporal del cupo** (5–10 minutos) mientras el paciente completa la reserva, con contador visible. Sin esto, las colisiones en horarios de alta demanda destruyen la confianza.
- Estado explícito de sobrecupo o lista de espera cuando corresponda.

**Lista de espera inteligente:** si no hay hora conveniente, el paciente se inscribe indicando disponibilidad ("cualquier día después de las 15:00"). Cuando se libera un cupo por cancelación, el sistema notifica automáticamente por orden de prioridad clínica y de inscripción, con ventana de aceptación acotada (ej. 30 minutos) antes de pasar al siguiente. Esta única funcionalidad es la que más recupera horas perdidas por no-show.

### 1.3 Reserva y pre-registro

- **Motivo de consulta** en campo libre corto y opcional, o mediante opciones sugeridas. Explicar para qué sirve.
- **Datos de previsión/seguro** con validación en línea contra el asegurador cuando exista API.
- **Consentimientos** (tratamiento de datos, telemedicina, política de cancelación) con lenguaje claro, versionados y con registro de fecha, hora y versión aceptada.
- **Carga anticipada de documentos**: órdenes médicas, exámenes previos, derivaciones. Desde la cámara del teléfono, con recorte automático.
- **Cuestionarios previos** (anamnesis, tamizaje, PROMs) enviados 48 h antes, no en el momento de reservar. Fragmentar en pantallas de 3–5 preguntas con barra de progreso y guardado automático.
- **Pago o copago** opcional en línea, con comprobante descargable y política de reembolso explícita.

### 1.4 Confirmación, recordatorios y llegada

- **Confirmación inmediata** en pantalla + correo + SMS/WhatsApp. Incluir: qué, quién, cuándo, dónde exactamente (piso, box, referencia visual), qué llevar, cuánto costará, cómo llegar y cómo cancelar.
- **Archivo .ics** para agregar al calendario personal en un toque.
- **Cadencia de recordatorios**: 7 días antes (informativo), 48 h antes (con botón de confirmar / reagendar / cancelar), 3 h antes (logístico: cómo llegar, estacionamiento). Configurable por el paciente y por tipo de prestación.
- **Confirmación activa de asistencia**: responder "1" por SMS o un toque en el enlace. Las horas no confirmadas a 24 h pueden liberarse a lista de espera según política del centro — pero esto debe comunicarse desde la reserva, nunca como sorpresa.
- **Check-in digital**: código QR, o geocerca que detecta llegada y avisa a admisión. Muestra tiempo de espera estimado en tiempo real y posición en la fila.
- **Sala de espera virtual** para telemedicina: test de cámara/micrófono/conexión previo, enlace que no requiere instalar nada, aviso cuando el profesional está por conectarse, y plan B automático (llamada telefónica) si falla el video.

### 1.5 Gestión posterior

- **Mis citas**: próximas y pasadas, con acciones claras de reagendar y cancelar. Reagendar debe ser un flujo de dos toques que preserva el contexto, no una cancelación seguida de una reserva nueva.
- **Política de cancelación visible** en el momento de cancelar, con consecuencias concretas.
- **Motivo de cancelación** (opcional, opciones cortas). Es oro puro para la operación: distingue "ya no lo necesito" de "no pude llegar" de "conseguí hora antes en otro lado".
- **Post-atención**: indicaciones del profesional, recetas y órdenes descargables, próximos controles sugeridos con agendamiento en un toque, resultados de exámenes cuando estén disponibles.
- **Encuesta de experiencia** breve (1–3 preguntas, NPS + campo abierto), enviada 2 h después de la atención.
- **Historial de derivaciones** y estado de cada una.

---

## 2. Módulo Usuario Clínico

El error más frecuente en estos sistemas es diseñar la vista del clínico como una versión más grande de la vista del paciente. No lo es. El clínico usa el sistema entre pacientes, con 30 segundos de atención disponible, muchas veces de pie. Su interfaz debe optimizarse para **lectura rápida y acciones de un clic**, no para exploración.

### 2.1 Vista de agenda

- **Vistas conmutables**: día (por defecto), semana, mes, y vista de lista para móvil.
- **Timeline vertical con bloques proporcionales a la duración**, no una lista uniforme. La forma de la agenda debe leerse de un vistazo: dónde hay huecos, dónde está apretado.
- **Codificación visual de estado** con color + icono + texto (nunca solo color):
  - Agendada · Confirmada por el paciente · Paciente en sala (check-in) · En atención · Atendida · No asistió · Cancelada · Sobrecupo
- **Indicadores de contexto en la tarjeta de cita**: primera vez / control, edad, previsión, alertas clínicas críticas (alergias, riesgo de caída, aislamiento), requerimientos de accesibilidad, documentos adjuntos pendientes de revisar.
- **Vista previa del paciente sin salir de la agenda**: panel lateral con últimos diagnósticos, medicamentos activos, últimos exámenes, resumen de la última atención. El clínico no debería tener que abrir la ficha completa para saber quién entra.
- **Contador en vivo**: pacientes esperando, atraso acumulado respecto de la agenda. Si el profesional va 25 minutos atrasado, el sistema debería poder avisar automáticamente a los pacientes que aún no llegan.

### 2.2 Control de la propia agenda

- **Plantillas de disponibilidad recurrente**: "Lunes y miércoles 09:00–13:00, box 4, controles de 20 min; jueves 15:00–18:00, primeras consultas de 40 min".
- **Duración diferenciada por tipo de prestación**, con posibilidad de excepción puntual.
- **Bloqueos**: reuniones, docencia, pausa de almuerzo, trabajo administrativo. Con motivo y visibilidad configurable.
- **Ausencias programadas** (vacaciones, congresos) con flujo de aprobación y **gestión asistida de las citas afectadas**: el sistema propone reagendamiento automático a otro profesional o a otra fecha, y redacta la comunicación al paciente. Nunca dejar que un bloqueo de agenda deje pacientes huérfanos en silencio.
- **Sobrecupos** con límite configurable por el administrador y registro de quién los autorizó.
- **Delegación**: secretaria clínica, TENS o coordinador con permisos para gestionar la agenda de uno o varios profesionales, con trazabilidad completa.

### 2.3 Durante y después de la atención

- **Iniciar / cerrar atención** con un clic, que registra tiempos reales (base para el análisis de duración vs. planificado).
- **Registro clínico mínimo** integrado o enlace profundo a la ficha electrónica sin repetir login.
- **Acciones de salida rápidas**: emitir receta, orden de examen, derivación, licencia, y **agendar el próximo control desde la misma pantalla**, viendo la disponibilidad real. Que el paciente salga de la consulta con la próxima hora ya reservada es la intervención más efectiva contra el abandono de tratamiento.
- **Marcado de no asistencia** con un clic, que dispara automáticamente el flujo de recuperación (contacto, reagendamiento, lista de espera).
- **Notas internas** no visibles para el paciente, claramente diferenciadas de las indicaciones que sí lo son.

### 2.4 Telemedicina

- Videollamada embebida, sin instalación, con sala de espera y consentimiento de grabación explícito.
- Chat y envío de archivos durante la sesión.
- Indicador de calidad de conexión de ambos extremos y degradación elegante a solo audio.
- Registro automático de duración efectiva y de incidencias técnicas (necesario para facturación y auditoría).

### 2.5 Detalles de diseño que marcan la diferencia

- **Atajos de teclado** para las cinco acciones más frecuentes, con hoja de ayuda accesible con `?`.
- **Sin diálogos modales bloqueantes** durante la jornada clínica. Usar paneles laterales y notificaciones no intrusivas.
- **Modo alto contraste y tamaño de texto ajustable**: los boxes clínicos suelen tener iluminación pésima y monitores viejos.
- **Funcionamiento offline degradado**: la agenda del día debe poder consultarse aunque caiga la red, con sincronización posterior.
- **Cero pérdida de trabajo**: guardado automático de cualquier formulario cada pocos segundos.

---

## 3. Módulo Administrador

### 3.1 Estructura organizacional

- **Sedes y ubicaciones**: dirección, horarios, zona horaria, feriados propios, datos de contacto, accesibilidad física.
- **Recursos físicos**: boxes, salas, sillones, equipos (ecógrafo, rayos, sillón dental). Las citas deben poder reservar recursos además de profesionales, con detección de conflicto.
- **Unidades y servicios**, con jerarquía y responsables.
- **Catálogo de prestaciones**: código, nombre clínico, nombre en lenguaje del paciente, duración estándar, preparación requerida, profesionales habilitados, recursos necesarios, precio por convenio.

### 3.2 Personas y permisos

- **RBAC granular** con roles predefinidos (recepción, coordinador de agenda, profesional, jefe de servicio, administrador, auditor) y permisos personalizables.
- **Principio de mínimo privilegio** y separación entre "ver agenda" y "ver datos clínicos".
- **Registro de acreditación profesional**: número de registro sanitario, especialidades, vigencia. Alertas de vencimiento.
- **Gestión de altas y bajas** con reasignación obligatoria de agenda pendiente.

### 3.3 Reglas de negocio configurables

Esto es lo que determina si el sistema sirve para un centro real o solo para la demo. Todas estas reglas deben ser parametrizables **sin desarrollo**:

- Antelación mínima y máxima de reserva (ej. no antes de 2 h, no después de 120 días)
- Ventana de cancelación sin penalización
- Número máximo de citas activas simultáneas por paciente
- Política de no-show: cuántas faltas antes de restringir autoagendamiento, y con qué proceso de apelación
- Reglas de sobrecupo por profesional y por servicio
- Prioridad clínica: qué prestaciones o perfiles de paciente saltan la lista de espera
- Reglas de derivación: qué prestaciones requieren orden previa validada
- Intervalos de amortiguación entre citas, tiempos de limpieza de box
- Requisitos de convenio: qué previsiones pueden agendar qué prestaciones

### 3.4 Operación diaria

- **Tablero en vivo**: ocupación por sede y servicio, pacientes en sala, atrasos, boxes libres, profesionales ausentes, citas sin confirmar para mañana.
- **Gestión masiva de agenda**: abrir o cerrar bloques a múltiples profesionales, aplicar feriados, cierres por emergencia. Con simulación previa ("esta acción afecta 212 citas de 187 pacientes") antes de ejecutar.
- **Gestión de lista de espera** con visión de demanda insatisfecha por especialidad — el insumo clave para decidir contrataciones.
- **Reasignación de pacientes** ante ausencia imprevista de un profesional, con propuesta automática y comunicación masiva.
- **Consola de comunicaciones**: plantillas de SMS/correo/WhatsApp versionadas, multiidioma, con variables, previsualización y control de costos de envío.

### 3.5 Analítica

Reportes que efectivamente se usan, más allá del volumen de citas:

| Indicador | Para qué decide |
|---|---|
| Tasa de ocupación de agenda | Dimensionar oferta |
| Tasa de no-show, segmentada por servicio, día, hora, canal y perfil | Diseñar recordatorios y sobrecupo |
| Tiempo de espera para primera hora disponible (*days to third next available*) | Métrica estándar de acceso |
| Tasa de utilización efectiva vs. horas ofertadas | Detectar agendas mal configuradas |
| Duración real vs. planificada por prestación | Recalibrar duraciones |
| Distribución por canal de agendamiento | Justificar inversión en autogestión |
| Tasa de conversión del flujo de reserva por paso | Detectar dónde abandona el paciente |
| Demanda insatisfecha (búsquedas sin resultado) | Planificación estratégica |
| NPS y satisfacción por profesional y sede | Gestión de calidad |
| Puntualidad y atraso acumulado | Gestión operacional |

Con exportación a CSV/Excel, programación de envío automático y API para BI corporativo.

### 3.6 Seguridad, cumplimiento y continuidad

- **Cifrado** en tránsito (TLS 1.3) y en reposo.
- **Auditoría inmutable**: quién vio, creó, modificó o eliminó qué y cuándo. Requisito legal en la mayoría de las jurisdicciones y la primera cosa que pide un auditor.
- **Autenticación multifactor** obligatoria para roles con acceso a datos clínicos.
- **Cumplimiento normativo** según jurisdicción (HIPAA, GDPR, LGPD, Ley 21.719 en Chile, etc.): consentimiento explícito, derecho de acceso y rectificación, minimización de datos, política de retención, notificación de brechas.
- **Anonimización** para ambientes de prueba y analítica.
- **Continuidad**: respaldos con RPO/RTO definidos, plan de modo degradado (impresión de agendas del día, procedimiento manual documentado), monitoreo y alertas.

### 3.7 Integraciones

- **HIS / ficha clínica electrónica** — idealmente vía HL7 FHIR R4 (recursos `Appointment`, `Schedule`, `Slot`, `Patient`, `Practitioner`, `Encounter`).
- Sistemas de facturación y aseguradoras
- Laboratorio e imagenología
- Pasarelas de pago
- Proveedores de SMS/WhatsApp/correo transaccional
- Firma electrónica avanzada para recetas y licencias
- Identidad digital estatal
- Calendarios externos (Google, Outlook) para profesionales
- Registro nacional de prestadores, si aplica

---

## 4. Modelo conceptual y decisiones técnicas con impacto en UX

Estas decisiones parecen técnicas pero determinan la experiencia:

**Entidades núcleo:** `Paciente`, `Profesional`, `Recurso`, `Sede`, `Prestación`, `PlantillaDeAgenda`, `Slot`, `Cita`, `ListaDeEspera`, `Notificación`, `Consentimiento`, `RegistroDeAuditoría`.

**Máquina de estados de la cita** — debe ser explícita y única, porque cada transición dispara notificaciones, reglas y métricas:

```
Solicitada → Agendada → Confirmada → Registrada (check-in) → En atención → Atendida
                ↓            ↓              ↓
            Cancelada   Reagendada     No asistió
```

**Concurrencia.** Dos pacientes tocando el mismo cupo simultáneamente es el escenario normal, no el excepcional. Se requiere bloqueo optimista con reserva temporal del slot y un mensaje de recuperación que no culpe al usuario ("Ese horario se acaba de tomar. Estos están libres y son cercanos: …").

**Zonas horarias y horario de verano.** Almacenar siempre en UTC con zona horaria de la sede. Las telemedicinas transfronterizas y los cambios de hora son la fuente clásica de citas fantasma.

**Idempotencia** en las operaciones de reserva: un doble clic o un reintento de red no puede generar dos citas.

**Auditabilidad de reglas.** Cuando el sistema rechaza una reserva, debe poder explicar por qué en lenguaje humano. "No se puede agendar" es inaceptable; "Esta prestación requiere una orden médica vigente" es accionable.

---

## 5. Sistema de diseño

### 5.1 Fundamentos

- **Tipografía**: base de 16 px mínimo en paciente, 14 px en interfaces densas. Familia con números tabulares (crítico para horarios y grillas) y buena distinción entre caracteres similares. Escala tipográfica limitada a 5–6 tamaños.
- **Color con semántica de estado** consistente entre los tres módulos, y siempre acompañado de icono y texto. Contraste verificado en modo claro y oscuro.
- **Espaciado** en escala de 4/8 px. Métrica generosa en paciente, compacta en clínico.
- **Modo oscuro** para el módulo clínico, que suele usarse en turnos nocturnos.

### 5.2 Componentes críticos

Los que hay que diseñar y testear con más cuidado:

1. **Selector de fecha y hora** — el componente más importante del sistema completo
2. **Tarjeta de cita** en sus tres variantes de densidad (paciente, agenda clínica, tablero admin)
3. **Timeline de agenda** con arrastrar y soltar para reagendar
4. **Buscador con autocompletado tolerante** a errores ortográficos y sinónimos coloquiales
5. **Estados vacíos** con acción sugerida, nunca una pantalla en blanco
6. **Diálogo de confirmación de acción destructiva** con consecuencia cuantificada
7. **Banner de estado de conexión** y cola de acciones pendientes de sincronizar

### 5.3 Contenido y microcopy

Merece un capítulo propio porque en salud el lenguaje es la mitad de la experiencia:

- Voz clara, directa, sin jerga médica en las pantallas de paciente. "Consulta de medicina general", no "Consulta ambulatoria APS nivel 1".
- Los mensajes de error dicen qué pasó, por qué y qué hacer ahora.
- Los recordatorios son accionables, no informativos: cada mensaje termina con una acción posible.
- Neutralidad y no estigmatización, especialmente en salud mental, salud sexual y adicciones.
- Multiidioma real, incluyendo lenguas indígenas donde corresponda, no solo traducción automática.

### 5.4 Proceso

- **Investigación con usuarios reales de los tres perfiles** antes de diseñar. Acompañar un día completo a una secretaria clínica enseña más que veinte reuniones de requerimientos.
- **Testeo de usabilidad moderado** con adultos mayores y personas con baja alfabetización digital, en sus propios dispositivos.
- **Testeo de accesibilidad** con usuarios de lector de pantalla, no solo con auditoría automatizada.
- **Métricas de UX instrumentadas**: tasa de finalización, tiempo hasta la tarea, errores por sesión, SUS trimestral.
- **Piloto en una sede** antes del despliegue general, con capacidad de revertir.

---

## 6. Métricas de éxito del proyecto

| Métrica | Referencia razonable |
|---|---|
| Citas agendadas en autogestión (sin call center) | > 50 % a los 12 meses |
| Finalización del flujo de reserva iniciado | > 80 % |
| Tiempo mediano para agendar (usuario recurrente) | < 90 segundos |
| Reducción de no-show respecto de línea base | 20–40 % con recordatorios + confirmación activa |
| Ocupación de agenda | > 85 % |
| Recuperación de cupos liberados vía lista de espera | > 60 % |
| NPS de pacientes | > 50 |
| Adopción por parte de clínicos a los 3 meses | > 90 % |

---

## 7. Secuencia de implementación sugerida

**Fase 1 — Núcleo (meses 1–4).** Modelo de datos, gestión de agendas y plantillas, reserva por parte del personal, vista de agenda del clínico, confirmaciones básicas por correo y SMS, auditoría. Objetivo: reemplazar la agenda en papel o Excel.

**Fase 2 — Autogestión del paciente (meses 4–8).** Portal y app de paciente, búsqueda, reserva, reagendamiento y cancelación en línea, recordatorios con confirmación activa, check-in digital. Objetivo: descargar el call center.

**Fase 3 — Inteligencia operacional (meses 8–12).** Lista de espera automatizada, sobrecupo dinámico, analítica avanzada, integración con ficha clínica y facturación, telemedicina.

**Fase 4 — Optimización (12+ meses).** Predicción de no-show por paciente y ajuste dinámico de sobrecupo, optimización automática de plantillas de agenda según demanda real, recomendación de horarios, agendamiento conversacional.

---

## Los cinco errores que hunden estos proyectos

1. **Pedir demasiados datos antes de mostrar disponibilidad.** El paciente abandona antes de ver una sola hora.
2. **Diseñar la agenda del clínico como una lista.** El clínico necesita ver la *forma* del día, no leerlo.
3. **Reglas de negocio codificadas en el software.** Cada centro tiene reglas distintas y las cambia cada trimestre. Si requieren desarrollo, el sistema muere.
4. **Ignorar los canales no digitales.** Mientras exista el mesón y el teléfono, deben escribir en el mismo sistema o habrá dos verdades.
5. **No diseñar el fallo.** Qué pasa cuando cae la red, cuando el profesional se enferma, cuando dos personas toman la misma hora. Ahí es donde se pierde o se gana la confianza.
