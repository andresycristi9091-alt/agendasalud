# Auditoria Fase 0 - AgendaSalud

Production audit: 69/100, beta funcional pero riesgosa para escala publica, principalmente por deuda de autenticacion dual, rate limiting inicialmente ausente, falta de Google Calendar OAuth por profesional, persistencia en Google Sheets y monolitos grandes en dashboard/admin.

Fecha: 2026-06-14  
Repositorio: `C:\Users\snowc\proyectos\agendasalud`  
Rama auditada: `main`  
Ultimo commit auditado: `25b6b46 feat: eliminar profesionales desde admin`

## 1. Stack detectado

| Area | Evidencia |
|---|---|
| Framework | Next.js 16.2.7 App Router, rutas en `app/` |
| Runtime UI | React 19.2.4 |
| Lenguaje | TypeScript 5, configurado en `tsconfig.json` |
| Estilos | Tailwind CSS 4 con `@tailwindcss/postcss`, estilos globales en `app/globals.css` |
| Auth | Supabase Auth + sesion HMAC local propia para usuarios internos/admin |
| Base de datos operativa | Google Sheets via `googleapis` en `lib/google/sheets.ts` |
| Calendario | Google Calendar API con service account en `lib/google/calendar.ts` |
| Email | Resend API via `fetch` en `lib/email.ts` |
| Validacion | Zod 4 en `lib/validation.ts` |
| Jobs/Cron | Vercel Cron en `vercel.json`, endpoint `/api/cron/reminders` |
| Deploy | Vercel |
| Gestor paquetes | npm, `package-lock.json` presente |
| Tests | No hay framework de tests ni scripts `test`/`e2e` |

Scripts actuales:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 2. Mapa del proyecto

### Rutas publicas

- `/`: landing publica.
- `/agendar`: directorio/funnel de seleccion de profesionales.
- `/agendar/[professionalSlug]`: funnel de reserva por profesional.
- `/mis-citas`: busqueda de citas por email.
- `/cancelar/[id]`: cancelacion publica con verificacion por email.
- `/login`: login profesional/admin.
- `/cambiar-contrasena`: recuperacion/cambio de clave.

### Dashboard

- `/dashboard`: redireccion por rol.
- `/dashboard/agenda`: agenda profesional.
- `/dashboard/citas`: listado/gestion de citas.
- `/dashboard/disponibilidad`: disponibilidad.
- `/dashboard/nueva-cita`: cita manual.
- `/dashboard/configuracion`: configuracion profesional limitada.
- `/dashboard/perfil`: cambio de clave.
- `/dashboard/admin`: panel administrador.

### APIs principales

Publicas:

- `GET /api/public/professionals`
- `GET /api/public/professional/[slug]`
- `GET /api/public/availability/[slug]`
- `GET /api/public/availability/batch/[slug]`
- `POST /api/public/appointments`
- `GET /api/public/appointments/[id]`
- `POST /api/public/appointments/[id]/cancel`
- `POST /api/public/appointments/by-email`

Dashboard/admin:

- `GET/PATCH /api/dashboard/professionals`
- `PATCH /api/dashboard/professionals/password`
- `GET/POST /api/dashboard/appointments`
- `PATCH /api/dashboard/appointments/[id]`
- `GET/POST /api/dashboard/availability`
- `DELETE /api/dashboard/availability/[id]`
- `GET/POST /api/admin/professionals`
- `PATCH/DELETE /api/admin/professionals/[id]`
- `GET/POST /api/admin/users`
- `PATCH/DELETE /api/admin/users/[id]`
- `GET/POST /api/admin/centers`
- `PATCH/DELETE /api/admin/centers/[id]`
- `POST /api/admin/login`
- `GET /api/admin/me`
- `POST /api/admin/bootstrap`
- `GET /api/cron/reminders`

### Servicios clave

- `lib/appointments.ts`: flujo de reserva, lock en memoria, Google Calendar, Sheets y notificaciones.
- `lib/availability.ts`: slots disponibles, disponibilidad semanal/por fecha y FreeBusy de Calendar.
- `lib/google/sheets.ts`: repositorio de datos sobre Google Sheets.
- `lib/google/calendar.ts`: crear/cancelar eventos y leer busy slots.
- `lib/email.ts`: templates y envio Resend.
- `lib/reminders.ts`: recordatorios 24h y 2h.
- `lib/auth/admin.ts`: rol actual, admin y cliente Supabase service role.
- `lib/auth/local-admin-session.ts`: cookie HMAC local.
- `lib/auth/permissions.ts`: autorizacion por centro/profesional/cita.
- `lib/validation.ts`: schemas Zod.

### Componentes grandes

- `components/dashboard/ClientWorkspace.tsx`: 1434 lineas. Monolito principal del profesional.
- `components/admin/AdminWorkspace.tsx`: 817 lineas. Monolito admin.
- `lib/google/sheets.ts`: 660 lineas. Capa de persistencia completa.
- `lib/email.ts`: 464 lineas. Templates y envio.

## 3. Funcionalidades existentes

### Funciona o esta implementado

- Landing publica comercial.
- Directorio publico multiprofesional.
- Funnel publico de agendamiento por profesional.
- Disponibilidad por fecha exacta y por dia semanal legacy.
- Consulta batch de disponibilidad para pintar disponibilidad por dia.
- Reserva con mutex in-memory y verificacion post-lock en Google Sheets.
- Creacion de evento en Google Calendar mediante service account.
- Cancelacion publica por link con validacion del email del paciente.
- Eliminacion del evento Calendar al cancelar.
- Emails de confirmacion, cancelacion, notificacion al profesional y recordatorios.
- Recordatorios cron 24h/2h con log en hoja `remindersSent`.
- Busqueda publica de citas por email.
- Dashboard profesional con agenda, citas, disponibilidad, cita manual, estados y estadisticas.
- Panel Admin para centros, profesionales y usuarios.
- Admin puede editar/eliminar/desactivar profesionales y usuarios.
- Perfil publico de profesional solo editable por Admin.
- Cambio de clave desde dashboard.

### A medias o con restricciones importantes

- Auth dual: Supabase + usuarios internos HMAC en Sheets. Funciona, pero aumenta complejidad y crea superficies duplicadas.
- Google Calendar usa service account global o calendarId/email del profesional compartido; no hay OAuth por profesional.
- Google Sheets sirve como base MVP, pero no da transacciones reales ni buen modelo relacional.
- Lock anti doble reserva es in-memory; la segunda verificacion en Sheets ayuda, pero no es una transaccion distribuida.
- Emails no tienen cola ni reintentos persistentes salvo recordatorios.
- Logs son `console.*`; no hay panel de errores ni observabilidad estructurada.
- README sigue siendo el default de Next.js y no documenta el producto real.

### Roto o riesgoso

- No hay rate limiting en login, busqueda por email, reserva ni reenvio/recuperacion.
- No hay test suite automatizada.
- No hay auditoria persistente de acciones admin.
- No hay CSRF explicito en mutaciones con cookie HMAC. Las APIs dependen de cookies y autorizacion server-side, pero falta proteccion adicional.
- `ADMIN_SESSION_SECRET` tuvo fallback historico segun handoff; en produccion debe ser obligatorio.
- Algunos textos del codigo tienen mojibake por encoding anterior. No siempre rompe funcionalidad, pero afecta mantenibilidad.

## 4. Modelo de datos actual vs modelo objetivo

### Actual en Google Sheets

`professionals`:

```text
id | slug | name | specialty | centerName | email | phone | calendarId |
publicDescription | appointmentDurationDefault | timezone | active |
createdAt | updatedAt | professionalType | photoUrl | centerId
```

`appointments`:

```text
id | professionalId | professionalSlug | patientName | patientEmail |
patientPhone | patientRut | reason | date | startTime | endTime |
timezone | status | googleCalendarEventId | createdAt | updatedAt
```

`availability`:

```text
id | professionalId | dayOfWeek | startTime | endTime | slotDuration |
active | createdAt | updatedAt
```

`centers`:

```text
id | name | slug | description | logoUrl | address | city | region |
phone | email | active | createdAt | updatedAt
```

`users`:

```text
id | email | name | passwordHash | role | centerId | active | createdAt | updatedAt
```

`remindersSent`:

```text
id | appointmentId | type | sentAt
```

### Brechas con modelo objetivo

| Entidad objetivo | Estado actual |
|---|---|
| User | Existe parcialmente en Supabase y `users`; falta `phone`, `emailVerifiedAt`, modelo unico |
| ProfessionalProfile | Existe mezclado en `professionals`; falta relacion clara userId-professionalId |
| Appointment | Existe; faltan `cancelledAt`, `cancellationReason`, `notes`, `userId` paciente |
| Availability | Existe; dayOfWeek tambien guarda fechas exactas |
| AvailabilityException | No existe |
| CalendarConnection | No existe; no hay OAuth ni tokens cifrados |
| EmailVerificationToken | No existe como modelo propio; depende de Supabase |
| PasswordResetToken | No existe como modelo propio; depende de Supabase o flujo HMAC |
| Reminder | Parcial: solo `remindersSent`, no estado pending/failed |
| NotificationLog | No existe |
| AuditLog | No existe |

## 5. Deuda tecnica y riesgos

### Blockers antes de escalar a clientes reales

1. **Rate limiting inexistente**  
   Riesgo: abuso de login, busqueda de citas por email y creacion de reservas.

2. **Persistencia critica en Google Sheets**  
   Riesgo: concurrencia, auditoria, rendimiento, integridad referencial y borrados definitivos sin historial.

3. **Auth dual sin consolidacion**  
   Riesgo: inconsistencias de roles, recuperacion de clave distinta segun origen, permisos dificiles de auditar.

4. **Google Calendar no es OAuth por profesional**  
   Riesgo: onboarding manual, permisos compartidos, errores silenciosos de calendario.

5. **Sin test suite**  
   Riesgo: cada cambio en reservas, disponibilidad y permisos puede romper flujos clave sin alarma.

### Riesgos altos

- Monolitos `ClientWorkspace.tsx` y `AdminWorkspace.tsx` dificultan cambios seguros.
- `lib/google/sheets.ts` concentra repositorio completo, helpers y borrado.
- Correos HTML en un unico archivo grande.
- Logs pueden incluir emails/telefonos en consola de produccion.
- No hay cola para emails: fallas no se reintentan de forma general.
- No hay export CSV desde Admin.
- No hay PWA ni navegacion mobile tipo app.

### Riesgos medios

- `.env.example` existe, pero README no explica setup real.
- Falta documento de operacion/rollback.
- Los endpoints publicos devuelven mensajes claros, pero falta estandar global de errores.
- No hay tracking de errores de sincronizacion Calendar por profesional.

## 6. Brechas por modulo objetivo

| Modulo | Estado | Brecha principal |
|---|---|---|
| Landing publica | Implementada | Mejorar copy y analytics despues |
| Auth + roles | Parcial | Consolidar rol/modelo, rate limiting, verificacion real para todos |
| Verificacion email | Parcial | Supabase para algunos usuarios; usuarios HMAC no tienen verificacion propia |
| Paciente | Parcial | Sin cuenta paciente; funciona busqueda por email sin registro |
| Profesional | Implementado MVP | Falta split, bloqueos/excepciones y OAuth Calendar |
| Google Calendar por profesional | No implementado objetivo | Solo service account/calendar compartido |
| Admin | MVP avanzado | Falta audit log, metricas mejores, exportacion |
| Agenda interna vs online | Implementado MVP | Falta vista mensual robusta y excepciones |
| Motor disponibilidad | MVP funcional | Falta transaccion real, anticipacion minima, ventana maxima configurable |
| Recordatorios | Parcial | Falta cola/reintentos/log general |
| Perfil paciente no clinico | No existe formal | Solo datos en citas |
| Finanzas | No existe | Preparar modelo |
| CRM basico | No existe | Preparar modelo |
| UX mobile/PWA | Parcial | Falta PWA y bottom navigation |

## 7. Estrategia propuesta por fases

### Fase 1 - Seguridad/Auth base (M)

Objetivo: bajar riesgo antes de seguir agregando features.

- Agregar rate limiting simple server-side para login, recovery, `by-email` y `appointments`.
- Hacer `ADMIN_SESSION_SECRET` obligatorio en produccion y documentarlo.
- Revisar proxy y proteccion CSRF para mutaciones sensibles.
- Documentar claramente Supabase vs HMAC en README.

Riesgo: romper login actual si se cambia demasiado. Hacer incremental.

### Fase 2 - Tests minimos de flujos criticos (M)

- Agregar Vitest o pruebas unitarias ligeras.
- Cubrir `generateTimeSlots`, `getAvailableSlotsForDate`, `bookAppointment` con dobles de Sheets/Calendar.
- Cubrir permisos de admin/profesional.

Riesgo: hay que desacoplar servicios para testear sin Google real.

### Fase 3 - Refactor monolitos UI (M/L)

- Extraer de `ClientWorkspace.tsx`: `AgendaTab`, `DisponibilidadTab`, `CitasTab`, `NuevaCitaTab`, `ConfiguracionTab`.
- Extraer de `AdminWorkspace.tsx`: `CentersAdmin`, `ProfessionalsAdmin`, `UsersAdmin`, `AdminStats`.
- Mantener comportamiento actual y snapshots manuales.

Riesgo: alto en UI por cantidad de estado compartido.

### Fase 4 - Modelo de datos y auditoria (L)

- Definir si se migra desde Sheets a Postgres/Supabase DB o se mantiene Sheets como MVP.
- Agregar `AuditLog`, `NotificationLog`, `AvailabilityException`.
- Evitar borrado definitivo sin audit log en produccion.

Riesgo: migracion de datos. Requiere confirmacion.

### Fase 5 - Calendar OAuth profesional (L)

- Crear `CalendarConnection`.
- OAuth 2.0 por profesional.
- Cifrado de tokens.
- Estado conectado/desconectado/error.
- Usar FreeBusy y eventos desde conexion propia.

Riesgo: requiere Google Cloud OAuth, redirect URIs y manejo seguro de refresh tokens.

### Fase 6 - UX mobile/PWA y CRM/finanzas (M/L)

- PWA manifest/service worker.
- Bottom navigation mobile.
- Perfil paciente administrativo.
- Export CSV.
- Finanzas basicas.

Riesgo: bajo a medio si se hace despues de estabilizar datos.

## 8. Evidencia revisada

- `package.json`
- `vercel.json`
- `proxy.ts`
- `lib/auth/admin.ts`
- `lib/auth/permissions.ts`
- `lib/supabase/middleware.ts`
- `lib/appointments.ts`
- `lib/availability.ts`
- `lib/google/sheets.ts`
- `lib/google/calendar.ts`
- `lib/email.ts`
- `lib/reminders.ts`
- `app/api/cron/reminders/route.ts`
- Rutas bajo `app/api/public`, `app/api/dashboard`, `app/api/admin`
- `CODEX.md`
- `HANDOFF_CLAUDE_CODE.md`
- `README.md`
- `package-lock.json`

Comandos ejecutados:

```bash
git status --short --branch
git log --oneline --decorate -20
rg --files
```

## 9. Evidencia faltante

- Cuenta de prueba segura para validar flujos en produccion.
- Logs de Vercel/Resend/Google para confirmar errores reales.
- Estado de variables de entorno en Vercel.
- Dataset real de Google Sheets y permisos compartidos.
- Politica comercial sobre borrado definitivo vs retencion legal/operativa.

## 10. Actualizacion posterior - 2026-06-14

Despues de esta auditoria se revisaron proyectos open source de agendamiento y se implemento una mitigacion inicial de rate limiting en endpoints sensibles:

- `POST /api/admin/login`
- `POST /api/auth/login`
- `POST /api/public/appointments`
- `POST /api/public/appointments/by-email`
- `POST /api/public/appointments/[id]/cancel`
- `PATCH /api/dashboard/professionals/password`

Archivo nuevo: `lib/rate-limit.ts`.

Esta mejora reduce riesgo de abuso, pero no reemplaza una solucion persistente compartida entre instancias. Para produccion a escala, migrar a Redis/Vercel KV/Unkey o persistencia transaccional.

Revision de referencias GitHub: `docs/GITHUB_SCHEDULING_REVIEW.md`.

## 11. Recomendacion

No empezar por OAuth, CRM o finanzas todavia. El siguiente paso mas rentable sigue siendo **Fase 1: seguridad/auth base**, ahora continuando con rate limiting persistente, endurecimiento de sesiones, CSRF en mutaciones sensibles y pruebas criticas.

Siguiente accion sugerida: agregar tests de flujos criticos y preparar rate limiting persistente externo para produccion.
