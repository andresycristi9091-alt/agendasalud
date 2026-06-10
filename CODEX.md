# AgendaSalud — Documento de Handoff para Codex

> Ultima actualizacion: Junio 2026  
> Estado: Base estabilizada. Ver secciones **Pendiente** para trabajo siguiente.

---

## 1. Que es este proyecto

AgendaSalud es un SaaS de agendamiento medico en Next.js 16 App Router + TypeScript + Tailwind CSS.

**Dos experiencias principales:**
- `/agendar` y `/agendar/[slug]` — paciente reserva hora online
- `/dashboard` — profesional/centro gestiona disponibilidad y citas
- `/dashboard/admin` — admin multi-centro crea centros, profesionales y usuarios

**Stack:**
- Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- Supabase Auth (profesionales/usuarios internos)
- Google Sheets como base de datos (profesionales, citas, disponibilidad, usuarios)
- Google Calendar para eventos y deteccion de ocupacion (FreeBusy)
- Zona horaria: `America/Santiago`
- Sin ORM ni base de datos SQL; toda persistencia en Google Sheets

---

## 2. Variables de entorno requeridas

Ver `.env.example` para lista completa. Las criticas:

| Variable | Descripcion |
|---|---|
| `ADMIN_SESSION_SECRET` | HMAC para sesiones locales. **Obligatorio.** Min 32 chars. |
| `ADMIN_EMAILS` | Correos admin separados por coma. **Obligatorio.** |
| `BOOTSTRAP_SECRET` | Secreto para el endpoint `/api/admin/bootstrap`. Solo al primer deploy. |
| `SUPABASE_SERVICE_ROLE_KEY` | Para crear/editar usuarios Supabase desde Admin. |
| `GOOGLE_CLIENT_EMAIL` | Service account Google. |
| `GOOGLE_PRIVATE_KEY` | Clave privada del service account. |
| `GOOGLE_SHEETS_ID` | ID del Google Spreadsheet principal. |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (ej: `https://agendasalud.vercel.app`). |
| `RESEND_API_KEY` | Para emails de confirmacion (opcional pero recomendado). |
| `EMAIL_FROM` | Remitente de emails (ej: `AgendaSalud <noreply@...>`). |

---

## 3. Archivos clave

```
lib/
  auth/
    local-admin-session.ts  — Sesiones HMAC para usuarios locales (no Supabase)
    admin.ts                — getAdminEmails(), requireAdmin(), getCurrentUserRole()
    password.ts             — hashPassword/verifyPassword con PBKDF2 (SHA-256 legacy fallback)
  google/
    sheets.ts               — Toda la lectura/escritura de Google Sheets
    calendar.ts             — Google Calendar y FreeBusy
  appointments.ts           — Flujo completo de booking con mutex anti-doble-reserva
  availability.ts           — Generacion de slots disponibles
  email.ts                  — Envio de confirmacion via Resend API
  mutex.ts                  — Lock en memoria para prevenir doble-booking concurrente
  validation.ts             — Schemas Zod para todos los inputs
  date.ts                   — Utilidades de hora chilena (America/Santiago)

components/
  public/
    PublicBookingPage.tsx   — Funnel de agendamiento del paciente (4 pasos)
    ProfessionalDirectoryPage.tsx — Directorio multi-profesional
  dashboard/
    ClientWorkspace.tsx     — Dashboard del profesional/centro
  admin/
    AdminWorkspace.tsx      — Panel multi-centro del admin

app/api/
  public/
    appointments/route.ts   — POST /api/public/appointments (crear cita)
    availability/[slug]/route.ts — GET disponibilidad por fecha
    professional/[slug]/route.ts — GET datos del profesional por slug
    professionals/route.ts  — GET directorio de profesionales
  admin/
    bootstrap/route.ts      — POST setup inicial admin (requiere BOOTSTRAP_SECRET)
    me/route.ts             — GET usuario actual autenticado
    professionals/          — CRUD profesionales
    centers/                — CRUD centros
    users/                  — CRUD usuarios
  dashboard/
    appointments/           — GET/PATCH citas del profesional
    availability/           — GET/POST/DELETE bloques de disponibilidad
    professionals/route.ts  — GET/PATCH perfil del profesional

lib/supabase/middleware.ts  — Protege /dashboard/* y /api/admin|dashboard/* con 401
next.config.ts              — Security headers (X-Frame-Options, HSTS, etc.)
```

---

## 4. Lo que se corrigio en esta sesion

### Seguridad (todos los CRITICAL y HIGH)

| # | Severidad | Archivo | Fix aplicado |
|---|---|---|---|
| 1 | CRITICAL | `lib/auth/local-admin-session.ts` | `getSecret()` ya no hace fallback a `NEXT_PUBLIC_*`. Falla duro si `ADMIN_SESSION_SECRET` no esta configurado. |
| 2 | CRITICAL | `lib/auth/admin.ts` | Eliminado `FALLBACK_ADMIN_EMAILS` con email personal hardcodeado. Solo usa `ADMIN_EMAILS` del env. |
| 3 | CRITICAL | `lib/auth/password.ts` | Reemplazado SHA-256 con PBKDF2 (100,000 iteraciones, SHA-512). Mantiene fallback para hashes legacy. |
| 4 | CRITICAL | `app/api/admin/bootstrap/route.ts` | Requiere `BOOTSTRAP_SECRET` en env + via header `Authorization: Bearer <secret>`. Contrasena minima 12 chars. |
| 5 | CRITICAL | `lib/appointments.ts` + `lib/mutex.ts` | Mutex en memoria (TTL 30s) que elimina la race condition de doble-booking. Doble verificacion post-lock. |
| 6 | HIGH | `next.config.ts` | Headers de seguridad: X-Frame-Options DENY, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy. |
| 7 | HIGH | `lib/supabase/middleware.ts` | Middleware ahora retorna 401 en `api/admin/*` y `api/dashboard/*` si no hay sesion valida. |
| 8 | HIGH | `app/api/admin/me/route.ts` | Ahora retorna 401 si no hay sesion en lugar de siempre responder 200. |
| 9 | HIGH | `lib/validation.ts` | `calendarId` con regex de validacion. `startTime < endTime` en `AppointmentSchema`. Fecha no puede ser pasada. |
| 10 | MEDIUM | `lib/auth/local-admin-session.ts` | Comparacion HMAC ahora es constant-time (XOR byte a byte). |

### Funcional — bugs criticos

| Archivo | Fix |
|---|---|
| `lib/email.ts` (nuevo) | Servicio de email con Resend API via fetch (sin dependencias nuevas). HTML de confirmacion completo. |
| `app/api/public/appointments/route.ts` | Llama `sendBookingConfirmation()` tras crear la cita. No bloquea la respuesta si el email falla. |
| `components/dashboard/ClientWorkspace.tsx` | `StatusBadge` con colores segun estado (confirmada=verde, completada=azul, cancelada=rojo, no_asiste=amarillo). |
| `components/dashboard/ClientWorkspace.tsx` | Paginacion de citas: boton "Ver todas (N)" en lugar del cap duro `.slice(0,5)`. |
| `components/dashboard/ClientWorkspace.tsx` | `deleteAvailability` y `updateAppointment` con manejo de errores y feedback al usuario. |
| `components/dashboard/ClientWorkspace.tsx` | Link publico usa `window.location.origin` en lugar de URL hardcodeada a produccion. |
| `components/public/PublicBookingPage.tsx` | `SuccessState` con botones: "Agregar a Google Calendar" (deeplink) + "Agendar otra hora". |
| `components/public/PublicBookingPage.tsx` | Rango de fechas: 21 dias iniciales, boton "Ver mas fechas" que extiende hasta 60 dias. |
| `lib/availability.ts` | Deduplicacion de slots con `Set<string>` para bloques solapados. Ordenamiento por hora. Log de falla de Calendar. |
| `.env.example` | Actualizado con todas las nuevas variables y documentacion inline. |

---

## 5. Pendiente — Trabajo siguiente (priorizado)

### P0 — Hacer antes de produccion real

#### [SEC] Reemplazar mutex en memoria con Redis distribuido
**Archivo:** `lib/mutex.ts`  
El mutex actual es in-memory y no funciona en deploys multi-instancia (Vercel serverless con warm instances distintas).  
**Solucion:** Usar [Upstash Redis](https://upstash.com) con `SET NX EX 30` como distributed lock.  
```ts
// Patron recomendado:
import { Redis } from '@upstash/redis'
const redis = Redis.fromEnv()
const acquired = await redis.set(lockKey, '1', { nx: true, ex: 30 })
```
Requiere: `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en env.

#### [SEC] Rate limiting en endpoints publicos
**Archivos:** `app/api/public/appointments/route.ts`, `app/api/auth/login/route.ts`, `app/api/admin/login/route.ts`  
Sin rate limiting actual. Usar `@upstash/ratelimit` con la misma instancia Redis de arriba.  
```ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '1m') })
const { success } = await ratelimit.limit(ip)
if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
```

#### [UX] Verificar que el slot solicitado existe en la disponibilidad configurada
**Archivo:** `app/api/public/appointments/route.ts`  
Actualmente se puede reservar cualquier hora/fecha via API directa.  
**Solucion:** Antes de `bookAppointment()`, llamar `getAvailableSlotsForDate()` y verificar que `startTime` aparece como disponible.

---

### P1 — Alto valor para el usuario

#### [UX] Indicadores de disponibilidad en el date-picker del paciente
**Archivo:** `components/public/PublicBookingPage.tsx`  
El paciente actualmente no sabe si un dia tiene slots antes de hacer click.  
**Solucion:**  
1. Crear endpoint `GET /api/public/availability/batch/[slug]?from=YYYY-MM-DD&to=YYYY-MM-DD` que retorne `{ [date]: boolean }`.  
2. En `DateStep`, mostrar un punto verde debajo de las fechas con disponibilidad.  
3. Hacer el fetch al montar el componente (1 request en lugar de N).

Esqueleto del endpoint:
```ts
// app/api/public/availability/batch/[slug]/route.ts
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  // Iterar fechas entre from y to, llamar getAvailableSlotsForDate para cada una
  // Retornar { "2026-06-15": true, "2026-06-16": false, ... }
}
```

#### [UX] Sistema de recordatorios automaticos
**No existe en el codigo actual.**  
Recordar al paciente 48h y 2h antes de su cita reduce no-shows ~20%.  
**Opciones:**
- Cron job en Vercel (`vercel.json` con `crons`) que cada hora lee citas de Sheets y envia emails pendientes.
- O Inngest / Trigger.dev para tareas programadas.  
**Campos necesarios en Sheets:** `reminderSent48h` (boolean), `reminderSent2h` (boolean).

#### [UX] Filtro FONASA / ISAPRE en directorio de profesionales
**Archivo:** `components/public/ProfessionalDirectoryPage.tsx`  
Agregar columna `previsiones` en Google Sheets (ej: `FONASA,ISAPRE Banmedica`) y filtro en el directorio.

#### [UX] Tipo de cita con duracion diferenciada
**Archivos:** `lib/validation.ts`, `components/dashboard/ClientWorkspace.tsx`, `lib/availability.ts`  
Actualmente un profesional tiene una sola duracion. Agregar soporte para tipos de cita (nuevo paciente, control, procedimiento) con duraciones distintas.  
Requiere nueva columna `appointmentTypes` en Sheets (JSON serializado) y selector en el funnel del paciente.

#### [ADMIN] Edicion y desactivacion de centros
**Archivo:** `components/admin/AdminWorkspace.tsx`, `app/api/admin/centers/[id]/route.ts`  
El archivo del route existe pero no hay UI de edicion.  
Agregar formulario de edicion igual al de creacion con PATCH al endpoint.

#### [ADMIN] Confirmacion antes de desactivar profesional
**Archivo:** `components/admin/AdminWorkspace.tsx`  
Accion destructiva sin dialogo. Agregar modal de confirmacion simple con `window.confirm()` o un componente propio.

---

### P2 — Diferenciacion de mercado

#### [PRODUCTO] Sistema de reviews verificados
Reviews solo visibles para pacientes que tuvieron cita (verificado por `appointmentId`).  
Requiere: nueva hoja `reviews` en Sheets, endpoint POST `/api/public/reviews` con validacion de que el `appointmentId` pertenece al `patientEmail` del request, y seccion de reviews en `/agendar/[slug]`.

#### [PRODUCTO] Waitlist automatica
Cuando una cita se cancela, notificar al primer paciente en lista de espera.  
Requiere: hoja `waitlist` en Sheets, webhook o polling post-cancelacion, email automatico via `lib/email.ts`.

#### [PRODUCTO] Analytics para profesionales
Dashboard con: tasa de utilizacion, no-shows por mes, horas pico, cancelaciones.  
Todo calculable desde los datos de Sheets existentes — no requiere nueva infraestructura.

#### [PRODUCTO] Booking familiar
Permitir reservar para otra persona (hijo, adulto mayor) con campos: `isProxy: true`, `patientName` (quien asiste), `bookerName` (quien reserva).  
Cambio minimo en `AppointmentSchema` y formulario.

#### [PRODUCTO] Politica de no-show configurable
Marcar pacientes con patron de no-show en Sheets y mostrar advertencia al profesional.

---

## 6. Arquitectura de datos (Google Sheets)

### Hoja: `professionals`
```
id | slug | name | specialty | centerName | centerId | email | phone |
calendarId | publicDescription | appointmentDurationDefault | timezone |
professionalType | photoUrl | active | createdAt | updatedAt
```

### Hoja: `appointments`
```
id | professionalId | professionalSlug | patientName | patientEmail |
patientPhone | patientRut | reason | date | startTime | endTime |
timezone | status | googleCalendarEventId | createdAt
```
Status posibles: `confirmada`, `completada`, `cancelada`, `no_asiste`

### Hoja: `availability`
```
id | professionalId | dayOfWeek | startTime | endTime | slotDuration | active | createdAt
```
dayOfWeek: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

### Hoja: `users`
```
id | email | name | role | centerId | passwordHash | active | createdAt | updatedAt
```
role: `admin`, `user`

### Hoja: `centers`
```
id | name | slug | description | logoUrl | active | createdAt | updatedAt
```

---

## 7. Flujo de booking (como funciona hoy)

```
POST /api/public/appointments
  → AppointmentSchema.safeParse(body)          [Zod — validacion de entrada]
  → getProfessionalBySlug(slug)                [Sheets — busca profesional]
  → acquireLock(professionalId, date, time)    [Mutex — previene doble-booking]
  → isSlotTaken(professionalId, date, time)    [Sheets — verifica post-lock]
  → createCalendarEvent(...)                   [Calendar — opcional, no bloquea]
  → createAppointment(...)                     [Sheets — registro definitivo]
  → releaseLock(...)                           [Mutex — libera lock]
  → sendBookingConfirmation(...)               [Email — async, no bloquea respuesta]
  → 201 { appointmentId, calendarEventId }
```

---

## 8. Comandos utiles

```bash
# Desarrollo
npm run dev

# Build (ejecutar antes de cada deploy)
npm run build

# Linting
npm run lint

# Variables de entorno: copiar y completar
cp .env.example .env.local
```

---

## 9. Decisiones de diseno importantes

- **Google Sheets como DB:** Deliberado para el MVP. No escala a miles de usuarios concurrentes. Para produccion real considerar migrar a Supabase/PostgreSQL con el mismo schema.
- **Mutex en memoria:** Suficiente para deploy single-instance. Reemplazar con Redis para multi-instancia (ver P0 arriba).
- **Sin migraciones:** El schema de Sheets se gestiona manualmente. Agregar columnas nuevas requiere actualizar las funciones de lectura/escritura en `lib/google/sheets.ts`.
- **Zona horaria:** Toda la logica asume `America/Santiago`. `lib/date.ts` tiene las utilidades de conversion. No usar `new Date()` directamente para calculos de disponibilidad.
- **Auth dual:** Supabase para profesionales/usuarios normales + sistema HMAC propio para el admin inicial. El sistema HMAC existe porque Supabase requiere `SUPABASE_SERVICE_ROLE_KEY` para crear usuarios, que puede no estar disponible en todos los ambientes.

---

*Generado por Claude Code — AgendaSalud handoff, Junio 2026*
