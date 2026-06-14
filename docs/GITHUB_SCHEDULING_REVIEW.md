# Revision GitHub - sistemas de agendamiento online

Fecha: 2026-06-14

Objetivo: revisar proyectos open source de agendamiento y extraer mejoras aplicables a AgendaSalud sin copiar codigo externo ni mezclar licencias.

## Repos revisados

| Proyecto | URL | Hallazgos utiles para AgendaSalud |
|---|---|---|
| Easy!Appointments | https://github.com/alextselegidis/easyappointments | Sistema maduro self-hosted. Refuerza la importancia de working plans, booking rules, organizacion por servicios/proveedores, Google Calendar sync, emails y multi-idioma. |
| Cal.diy | https://github.com/calcom/cal.diy | Stack moderno Next.js/React/Tailwind/Prisma. La documentacion explicita rate limiting opcional con Unkey; se tomo como patron para endurecer endpoints sensibles del MVP. |
| NextAppointments | https://github.com/ajdichmann/nextappointments | Pone foco en disponibilidad configurable, buffer times, booking rules, recordatorios por email/SMS, branding y responsive. |
| NexCal | https://github.com/ribato22/nexcal | Roadmap muy cercano a SaaS: multi-provider, roles OWNER/STAFF, WhatsApp reminders, Google Calendar sync, buffers, portal paciente, analytics y multi-tenant. |
| Next.js Appointment Booking | https://github.com/TobiasGleiter/nextjs-appointment-booking | Referencia de estructura con dashboard, gestion de horarios, auth y pruebas E2E/componentes. |

## Patrones detectados

1. Seguridad y anti-abuso:
   - Rate limiting en login, reserva y endpoints publicos.
   - Proteccion contra scraping de datos por email o ID.
   - Mensajes de error claros, sin filtrar informacion privada.

2. Motor de agenda:
   - Reglas de reserva configurables.
   - Buffer times antes/despues de una cita.
   - Ventana maxima de reserva futura.
   - Anticipacion minima para agendar.
   - Excepciones de disponibilidad por feriados, vacaciones o bloqueos puntuales.

3. Experiencia paciente:
   - Funnel visual por profesional.
   - Portal de autoconsulta/cancelacion/reagendamiento.
   - Confirmaciones y recordatorios por email/WhatsApp.

4. Experiencia profesional:
   - Agenda diaria como centro de mando.
   - Accesos rapidos por modulos.
   - Metricas de jornada.
   - Control de disponibilidad sin entrar a Google Calendar.

5. Administracion SaaS:
   - Multi-centro/multi-tenant.
   - Roles por centro.
   - Auditoria de acciones.
   - Reportes por centro/profesional.
   - Exportacion operativa.

## Integracion aplicada ahora

Se implemento un rate limiter server-side interno, sin dependencias nuevas, en:

- `lib/rate-limit.ts`
- `POST /api/admin/login`
- `POST /api/auth/login`
- `POST /api/public/appointments`
- `POST /api/public/appointments/by-email`
- `POST /api/public/appointments/[id]/cancel`
- `PATCH /api/dashboard/professionals/password`

Motivo: es la mejora mas transversal y segura para el MVP actual. Reduce abuso en login, reservas, busqueda de citas por email, cancelaciones y cambio de contrasena sin redisenar la arquitectura.

Limitacion: el rate limiter es in-memory. En Vercel puede reiniciarse o no compartir estado entre instancias. Es suficiente como primera barrera MVP, pero para escala real conviene migrarlo a Upstash Redis, Vercel KV, Unkey o una tabla transaccional.

## Roadmap sugerido desde la revision

Prioridad alta:

- Rate limiting persistente externo para produccion.
- Reglas de agenda configurables: anticipacion minima, ventana maxima y maximo de reservas por dia.
- Excepciones de disponibilidad: feriados, vacaciones, bloqueos manuales.
- Audit log de acciones admin/profesional.

Prioridad media:

- Buffer times por profesional.
- Reagendamiento publico con validacion por email.
- Export CSV/XLSX de citas por centro.
- ICS para pacientes.
- Dashboard de ocupacion por centro/profesional.

Prioridad futura:

- OAuth Google Calendar por profesional.
- WhatsApp Business oficial para recordatorios.
- Portal paciente con historial no clinico.
- PWA mobile.
- Migracion desde Google Sheets a base relacional con transacciones.
