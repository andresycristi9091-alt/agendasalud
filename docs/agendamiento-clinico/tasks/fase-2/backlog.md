# Fase 2 — Autogestión del paciente (meses 4–8)

Objetivo: descargar el call center. Meta: >50 % de las citas agendadas sin
intervención humana a los 12 meses.

---

## F2-01 · Portal paciente — descubrimiento y búsqueda

**Depende de:** F1-10

Tres puntos de entrada porque hay tres mentalidades distintas: por prestación
("necesito un dermatólogo"), por profesional ("quiero con la Dra. Rojas"),
y por urgencia ("lo antes posible").

**Alcance**
- Buscador con autocompletado tolerante a errores y sinónimos coloquiales
  ("dolor de muela" → Odontología), usando `pg_trgm` y `service.search_terms`
- Filtros: modalidad, sede con distancia, previsión con **precio estimado visible**,
  franja horaria, idioma y género del profesional, continuidad de cuidado
- Vista "primeras horas disponibles" sin filtros previos
- SSR para las páginas de descubrimiento (SEO real: "dermatólogo en [comuna]"
  es una fuente de demanda medible)

**Criterios de aceptación**
- [ ] Nunca se muestra un calendario vacío: si no hay cupo en el mes visible,
      salta al primer día disponible y lo dice explícitamente
- [ ] Bloques agrupados por franja (Mañana/Tarde/Noche), no una grilla de 40 botones
- [ ] LCP < 2,5 s en 3G lenta con dispositivo de gama baja, verificado en CI
- [ ] El precio estimado según previsión es visible **antes** de reservar
- [ ] `axe-core` en verde; probado con lector de pantalla manualmente
- [ ] Rate limit anti-scraping sin degradar al usuario legítimo

---

## F2-02 · Portal paciente — flujo de reserva

**Depende de:** F2-01, F1-07

**Principio:** la ruta feliz en tres decisiones. Todo dato que no sea imprescindible
para asegurar el cupo se pide **después** de la reserva, no antes.

**Alcance**
- Registro mínimo (documento, fecha de nacimiento, teléfono, correo) + OTP
- **Agendamiento como invitado** con oferta de crear cuenta al final, ya con
  los datos precargados
- Hold con contador visible y renovación
- Consentimientos versionados con lenguaje claro
- Carga de documentos desde la cámara del teléfono, con recorte automático
- Confirmación multicanal + archivo `.ics`
- Perfiles vinculados: agendar por hijos, adultos mayores, personas a cargo

**Criterios de aceptación**
- [ ] Tasa de finalización del flujo iniciado > 80 % en pruebas moderadas
- [ ] Tiempo mediano hasta reservar (usuario recurrente) < 90 s
- [ ] El contador del hold es visible y avisa antes de expirar
- [ ] Probado con adultos mayores en sus propios dispositivos, no en el laboratorio
- [ ] El error de contención muestra alternativas, nunca un mensaje sin salida
- [ ] Doble clic en confirmar → 1 cita (I-04 verificado en E2E)

---

## F2-03 · Gestión posterior: reagendar y cancelar

**Depende de:** F2-02

- Reagendar como **flujo de dos toques que preserva el contexto**, no una
  cancelación seguida de reserva nueva (la cadena queda en `previous_appointment_id`)
- Política de cancelación visible en el momento de cancelar, con consecuencias concretas
- Motivo de cancelación con opciones cortas — dato de altísimo valor operacional:
  distingue "ya no lo necesito" de "no pude llegar" de "conseguí hora antes en otro lado"

**Criterios de aceptación**
- [ ] Reagendar preserva la cadena y no libera el cupo antes de asegurar el nuevo
- [ ] La política de cancelación se muestra antes de confirmar, no después
- [ ] El motivo es opcional pero con tasa de respuesta > 60 % en pruebas

---

## F2-04 · Confirmación activa y check-in digital

**Depende de:** F1-13

- Confirmación por respuesta "1" a SMS o un toque en el enlace
- Política de liberación de horas no confirmadas, **comunicada desde la reserva**,
  nunca como sorpresa
- Check-in por QR o geocerca, con tiempo de espera estimado en tiempo real
- Notificación automática de atraso del profesional a quienes aún no llegan

**Criterios de aceptación**
- [ ] La política de liberación aparece en la confirmación original
- [ ] El check-in por geocerca es opcional y con permiso explícito
- [ ] El tiempo de espera mostrado se calcula del atraso real, no del planificado
- [ ] Sin datos de ubicación en logs ni en URLs (I-11)

---

## F2-05 · Lista de espera inteligente

**Depende de:** F1-08

La funcionalidad con mejor retorno de todo el sistema.

- Inscripción con disponibilidad declarada
- Motor de matching disparado por `SlotReleased`
- **Ofertas en serie, no en paralelo**: ofrecer el mismo cupo a cinco personas y
  dárselo al primero que responde destruye la confianza
- Ventana de aceptación adaptativa: 30 min si la cita es en 2 semanas, 10 min si
  es mañana, sin oferta automática si es en menos de 2 horas (ahí se llama por teléfono)
- Respeto de horas de silencio
- Límite de rechazos antes de pedir actualizar la disponibilidad declarada

**Criterios de aceptación**
- [ ] Un slot liberado nunca tiene dos ofertas activas simultáneas (índice único)
- [ ] Recuperación de cupos liberados > 60 % en piloto
- [ ] Prioridad clínica se respeta sobre antigüedad
- [ ] Aceptar una oferta usa el mismo `BookingService` de F1-07, sin ruta alternativa

---

## F2-06 · Encuestas y post-atención

- Indicaciones y órdenes descargables
- Encuesta breve (NPS + campo abierto) 2 h después de la atención
- Próximos controles sugeridos con agendamiento en un toque

**Criterios de aceptación**
- [ ] La encuesta tiene 3 preguntas o menos
- [ ] No se envía encuesta si la cita terminó en `noshow` o `cancelled`
