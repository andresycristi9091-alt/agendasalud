# AgendaSalud - Contexto completo del proyecto

> Lee este archivo completo antes de tocar codigo.
> Actualiza las secciones "Estado actual" y "Pendiente" cuando termines trabajo.

---

## Producto

AgendaSalud es un SaaS de agendamiento medico hecho en Chile. Permite a pacientes reservar horas con profesionales de salud en linea, con confirmacion por correo, recordatorios automaticos y sincronizacion con Google Calendar.

Tres perfiles:
- Paciente: agenda, cancela y ve sus citas sin registro (solo email)
- Profesional: gestiona su agenda, disponibilidad y citas desde un dashboard
- Administrador: crea y administra centros, profesionales y usuarios

URL de produccion: https://agendasalud.vercel.app

---

## Stack tecnico

| Capa | Tecnologia |
|---|---|
| Framework | Next.js 16 App Router (Turbopack) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS |
| Auth profesional | Supabase Auth |
| Auth admin/usuario | HMAC local (cookie agendasalud_admin_session) |
| Base de datos | Google Sheets (API v4 con service account) |
| Calendar | Google Calendar API (FreeBusy + eventos) |
| Email | Resend API |
| Cron | Vercel Cron Jobs (vercel.json) |
| Deploy | Vercel |
| Zona horaria | America/Santiago (toda la logica de hora es en hora chilena) |
| Validacion | Zod |
| UUID | uuid v4 |

---

## Rutas de la aplicacion

### Publicas (sin autenticacion)

| Ruta | Descripcion |
|---|---|
| / | Landing page comercial |
| /agendar | Directorio de profesionales |
| /agendar/[slug] | Funnel de agendamiento por profesional |
| /mis-citas | Paciente busca sus citas por email (sin registro) |
| /cancelar/[id] | Paciente cancela una cita desde el link del correo |
| /login | Login unificado (profesional via Supabase, admin/usuario via HMAC) |
| /cambiar-contrasena | Cambio de clave via email recovery |

### Dashboard (requiere sesion)

| Ruta | Descripcion |
|---|---|
| /dashboard | Redirige a la sub-ruta correcta segun rol |
| /dashboard/agenda | Vista de agenda del profesional |
| /dashboard/citas | Lista de citas del profesional |
| /dashboard/disponibilidad | Configuracion de horarios |
| /dashboard/nueva-cita | Crear cita manual |
| /dashboard/configuracion | Perfil del profesional (vista limitada) |
| /dashboard/perfil | Cambio de clave |
| /dashboard/admin | Panel admin (solo rol admin) |

### APIs publicas

| Metodo + Ruta | Funcion |
|---|---|
| GET /api/public/professionals | Lista de profesionales activos |
| GET /api/public/professional/[slug] | Datos de un profesional |
| GET /api/public/availability/[slug]?date=YYYY-MM-DD | Slots disponibles para una fecha |
| GET /api/public/availability/batch/[slug]?from=&to= | Mapa de disponibilidad por dia (max 30 dias) |
| POST /api/public/appointments | Crear nueva cita (paciente) |
| GET /api/public/appointments/[id] | Ver datos de una cita por ID |
| POST /api/public/appointments/[id]/cancel | Cancelar cita (requiere email del paciente) |
| POST /api/public/appointments/by-email | Buscar citas de un paciente por email |

### APIs dashboard (requiere sesion profesional/admin)

| Metodo + Ruta | Funcion |
|---|---|
| GET /api/dashboard/professionals | Profesionales accesibles al usuario logueado |
| PATCH /api/dashboard/professionals | Editar perfil del profesional (solo admin) |
| PATCH /api/dashboard/professionals/password | Cambiar clave (usuarios HMAC locales) |
| GET /api/dashboard/appointments | Citas del profesional (con filtros) |
| POST /api/dashboard/appointments | Crear cita manual desde el dashboard |
| PATCH /api/dashboard/appointments/[id] | Cambiar estado de una cita |
| GET /api/dashboard/availability | Bloques de disponibilidad |
| POST /api/dashboard/availability | Crear bloque |
| DELETE /api/dashboard/availability/[id] | Eliminar bloque |

### APIs admin (requiere rol admin)

| Metodo + Ruta | Funcion |
|---|---|
| POST /api/admin/login | Login admin con email+password |
| GET /api/admin/me | Sesion actual |
| POST /api/admin/bootstrap | Crear/actualizar usuario admin inicial |
| GET/POST /api/admin/professionals | Listar y crear profesionales |
| PATCH/DELETE /api/admin/professionals/[id] | Editar o desactivar profesional |
| GET/POST /api/admin/users | Listar y crear usuarios |
| PATCH/DELETE /api/admin/users/[id] | Editar o desactivar usuario |
| GET/POST /api/admin/centers | Listar y crear centros |
| PATCH /api/admin/centers/[id] | Editar centro |
| GET /api/cron/reminders | Cron de recordatorios (Vercel, cada hora) |

---

## Archivos clave

### Logica de negocio

```
lib/
  appointments.ts        Motor de reserva: mutex + Calendar + Sheets + emails
  availability.ts        Generacion de slots libres: Sheets + Google Calendar FreeBusy
  reminders.ts           Logica de recordatorios automaticos (24h y 2h antes)
  email.ts               Templates HTML y envio via Resend:
                           sendBookingConfirmation      (paciente al reservar)
                           sendProfessionalNotification (profesional al reservar)
                           sendCancellationEmail        (paciente al cancelar)
                           sendReminderEmail            (recordatorio automatico)
  validation.ts          Schemas Zod para todas las entidades
  date.ts                Utilidades de hora chilena (todayString, nowInChile, etc.)
  mutex.ts               Lock in-memory para prevenir doble reserva concurrente
  auth/
    admin.ts             getCurrentUserRole(), requireAdmin(), createAdminSupabaseClient()
    local-admin-session.ts  Sesion HMAC (cookie agendasalud_admin_session)
    password.ts          hashPassword() y verifyPassword() con PBKDF2
    permissions.ts       requireAppointmentAccess() - valida acceso a la cita
  google/
    sheets.ts            Toda la lectura/escritura de Google Sheets
    calendar.ts          createCalendarEvent(), cancelCalendarEvent(), getBusySlots()
  supabase/
    client.ts            Cliente Supabase para el navegador
    server.ts            Cliente Supabase para el servidor
    middleware.ts        Supabase middleware helper
```

### Componentes principales

```
components/
  public/
    LandingPage.tsx           Landing con Hero, HowItWorks, RoleBenefits, Features, Security, CTA
    ProfessionalDirectoryPage.tsx  Directorio multiprofesional /agendar
    PublicBookingPage.tsx     Funnel de agendamiento: fecha -> slot -> formulario -> exito
    CancelAppointmentPage.tsx Cancelacion publica desde link del correo
    MisCitasPage.tsx          Busqueda de citas por email sin registro
    PublicTrustFooter.tsx     Footer de confianza en paginas publicas
  dashboard/
    ClientWorkspace.tsx       Dashboard profesional completo (MONOLITO - candidato a split)
    ProfilePasswordPage.tsx   Cambio de clave (modo directo y por correo)
  admin/
    AdminWorkspace.tsx        Panel admin (MONOLITO - candidato a split)
  agenda/
    AgendaDia.tsx
    TarjetaCita.tsx
    FechaSelectorAgenda.tsx
    FormNuevaCita.tsx
    FormSetup.tsx
  ui/
    Badge.tsx
    Modal.tsx
    Logo.tsx
    LogoutButton.tsx
  AgendaSaludLoginPage.tsx    Pantalla de login unificada
```

---

## Google Sheets: estructura de hojas

### professionals (columnas A:Q)
```
id | slug | name | specialty | centerName | email | phone | calendarId |
publicDescription | appointmentDurationDefault | timezone | active |
createdAt | updatedAt | professionalType | photoUrl | centerId
```

### appointments (columnas A:Q)
```
id | professionalId | professionalSlug | patientName | patientEmail |
patientPhone | patientRut | reason | date | startTime | endTime |
timezone | status | googleCalendarEventId | createdAt | updatedAt
```

Estados de status: confirmada | cancelada | completada | no_asiste | reagendada

### availability (columnas A:I)
```
id | professionalId | dayOfWeek | startTime | endTime | slotDuration | active | createdAt | updatedAt
```
dayOfWeek puede ser monday|tuesday|...sunday o una fecha especifica YYYY-MM-DD.

### centers (columnas A:M)
```
id | name | slug | description | logoUrl | address | city | region | phone | email | active | createdAt | updatedAt
```

### users (columnas A:I)
```
id | email | name | passwordHash | role | centerId | active | createdAt | updatedAt
```
passwordHash formato: pbkdf2$salt:hash (100k iteraciones SHA-512)

### remindersSent (columnas A:D)
```
id | appointmentId | type | sentAt
```
type: 24h o 2h. Evita enviar el mismo recordatorio dos veces.

---

## Autenticacion: dos sistemas paralelos

### Sistema 1: Supabase Auth (profesionales)
- Login via email+password en Supabase
- createClient() en el servidor devuelve el usuario
- supabase.auth.updateUser({ password }) para cambiar clave
- Callback OAuth en /auth/callback

### Sistema 2: HMAC local (admin y usuarios de centro)
- Cookie HTTP-only agendasalud_admin_session
- JWT casero firmado con HMAC-SHA256
- Payload: { email, role, name, centerId, iat, exp }
- TTL: 8 horas
- Usuarios almacenados en hoja users de Google Sheets con PBKDF2
- getLocalAdminSession() lee y verifica la cookie
- setLocalUserSession() emite la cookie

### Como funciona getCurrentUserRole()
1. Primero intenta leer la sesion HMAC local
2. Si no hay sesion local, lee la sesion de Supabase
3. Devuelve { user, role: 'admin'|'user'|'anonymous', isAdmin }

### Flujo de login
- POST /api/admin/login: valida contra users en Sheets o contra admin bootstrap
- Si el correo esta en ADMIN_EMAILS o el rol en metadata de Supabase es 'admin' -> isAdmin = true
- Los profesionales logueados via Supabase NO aparecen en la hoja users

---

## Flujo de reserva (anti doble-booking)

```
Paciente llena formulario
  -> POST /api/public/appointments
  -> bookAppointment()
    -> acquireLock(professionalId, date, startTime)  <- mutex en memoria
    -> isSlotTaken() en Google Sheets                <- verificacion post-lock
    -> createCalendarEvent()                         <- Google Calendar (no bloquea si falla)
    -> createAppointment()                           <- Google Sheets
    -> sendBookingConfirmation()                     <- email al paciente (no bloquea)
    -> sendProfessionalNotification()                <- email al profesional (no bloquea)
    -> releaseLock()
  -> retorna { success: true, appointmentId }
```

Nota sobre el lock: es in-memory en el proceso Node. En Vercel con multiples instancias, la segunda verificacion con isSlotTaken() en Sheets es la que realmente previene el doble booking entre instancias.

---

## Flujo de cancelacion

### Desde link del correo (paciente)
```
/cancelar/[id]
  -> CancelAppointmentPage carga GET /api/public/appointments/[id]
  -> Paciente ingresa su email y confirma
  -> POST /api/public/appointments/[id]/cancel { email }
    -> Verifica email == appointment.patientEmail
    -> updateAppointmentStatus(id, 'cancelada')
    -> cancelCalendarEvent()
    -> sendCancellationEmail() al paciente
```

### Desde el dashboard (profesional/admin)
```
PATCH /api/dashboard/appointments/[id] { status: 'cancelada' }
  -> requireAppointmentAccess(id)
  -> updateAppointmentStatus(id, 'cancelada')
  -> cancelCalendarEvent()
  -> sendCancellationEmail() al paciente
```

---

## Sistema de recordatorios

- Cron en vercel.json: GET /api/cron/reminders cada hora
- sendPendingReminders() en lib/reminders.ts:
  - Lee citas de hoy y manana desde Sheets
  - Filtra por ventana 24h (20-30 horas antes) y 2h (90-180 min antes)
  - Chequea remindersSent para no re-enviar
  - Llama sendReminderEmail() y logReminderSent()
- Seguridad: si CRON_SECRET esta definido, valida Authorization: Bearer <secret>

---

## Variables de entorno

```bash
# Google API (obligatorio)
GOOGLE_CLIENT_EMAIL=        # service account email
GOOGLE_PRIVATE_KEY=         # clave privada con \n como saltos de linea
GOOGLE_PROJECT_ID=          # id del proyecto GCP
GOOGLE_SHEETS_ID=           # ID del Google Sheets
GOOGLE_CALENDAR_ID=         # Calendar ID de fallback global

# Supabase (obligatorio para login de profesionales)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # para crear usuarios desde admin

# Admin
ADMIN_EMAILS=               # lista separada por comas: admin@x.cl,otro@x.cl
ADMIN_SESSION_SECRET=       # secret para firmar cookies HMAC (cambiar en prod)
DEFAULT_CENTER_ID=          # ID del centro por defecto para usuarios nuevos

# Email
RESEND_API_KEY=             # API key de Resend.com
EMAIL_FROM=                 # "AgendaSalud <noreply@tudominio.cl>"

# App
NEXT_PUBLIC_APP_URL=        # URL publica: https://agendasalud.vercel.app

# Cron security
CRON_SECRET=                # secret para el endpoint /api/cron/reminders
```

---

## Reglas criticas de desarrollo

1. NO emojis en codigo: hubo problemas de encoding anteriores.
2. NO exponer credenciales Google en frontend: toda integracion en lib/google/* y rutas API server-side.
3. La hora SIEMPRE es chilena: usar TIMEZONE = 'America/Santiago' y las utilidades de lib/date.ts. Nunca new Date() crudo para calcular disponibilidad.
4. NO datos clinicos sensibles del paciente: solo nombre, email, telefono y RUT (opcional).
5. NO pedir confirmacion de Supabase para usuarios HMAC: los usuarios en la hoja users no tienen sesion de Supabase.
6. Verificar SIEMPRE con build: npm.cmd run build antes de dar trabajo por terminado.
7. Sin hardcodear secrets: siempre variables de entorno.
8. Validar en el backend: los schemas Zod estan en lib/validation.ts y se usan en las rutas API.
9. La informacion publica visible para clientes/pacientes solo puede editarla el Administrador. El Profesional no puede editar foto, descripcion, especialidad publica, correo publico, telefono publico, Calendar ID ni duracion base del perfil.
10. PATCH /api/dashboard/professionals exige requireAdmin(); no basta con tener acceso profesional al centro.

---

## Credenciales admin iniciales (cambiar en produccion)

- Email: admin@agendasalud.cl
- Password: admin
- El login llama a /api/admin/bootstrap que crea el usuario si no existe

---

## Como ejecutar localmente

```bash
npm install
# Copiar .env.example a .env.local y completar variables
npm run dev        # http://localhost:3000
npm run build      # verificar que compila sin errores
```

---

## Convenciones de codigo

- Funciones utilitarias: camelCase en lib/
- Componentes: PascalCase en components/
- Rutas API: Next.js App Router route handlers (route.ts)
- Sin comentarios innecesarios: el codigo debe ser autoexplicativo
- Sin console.log en produccion: solo console.warn y console.error para errores reales
- Imports absolutos: usar @/lib/..., @/components/...
- No mutar objetos: siempre spread operator para updates
- Funciones menores de 50 lineas, archivos menores de 800 lineas

---

## Estado actual (2026-06-14)

### Funciona en produccion
- Landing page con Hero, HowItWorks, RoleBenefits, Features, Security, CTA
- Directorio de profesionales /agendar
- Funnel de agendamiento publico /agendar/[slug] con dots de disponibilidad batch
- Reserva de citas con anti doble-booking (mutex + Sheets)
- Creacion de evento en Google Calendar al reservar
- Email de confirmacion al paciente (Resend)
- Email de notificacion al profesional al reservar
- Cron de recordatorios 24h y 2h (Vercel, cada hora)
- Pagina de cancelacion publica /cancelar/[id] con verificacion por email
- Eliminacion de evento Calendar al cancelar
- Email de cancelacion al paciente
- Busqueda de citas por email /mis-citas (sin registro)
- Dashboard profesional (agenda, citas, disponibilidad, nueva cita)
- Panel admin (centros, profesionales, usuarios)
- Login dual: Supabase + HMAC local
- Cambio de clave directo desde dashboard (modo directo + recovery por email)
- Admin puede crear usuarios con nombre y clave temporal
- Resolucion correcta del nombre de usuario en Supabase (5 campos de metadatos)
- Estado reagendada en el schema de Appointment

### Pendiente (proximos sprints)

- Split de ClientWorkspace.tsx: monolito de mas de 800 lineas. Extraer: AgendaTab, CitasTab, DisponibilidadTab, NuevaCitaTab, ConfiguracionTab
- Split de AdminWorkspace.tsx: mismo problema
- Email al profesional cuando se cancela su cita desde cualquier origen
- Reagendamiento real: cambiar fecha/hora de una cita existente (hoy existe el estado pero no hay UI ni logica)
- Ficha basica de paciente: historial acumulado por email con anotaciones administrativas
- Modulo de finanzas basico: precio por servicio, estado de pago, reporte simple
- PWA: manifest.json y service worker para instalacion movil
- Navegacion movil mejorada: barra inferior para pacientes en mobile
- Metricas en admin: graficos de ocupacion, inasistencias, profesionales mas activos
- Exportar datos: CSV de citas desde admin
- Google Calendar OAuth por profesional: actualmente usa service account global. Para escalar cada profesional deberia conectar su propio Calendar via OAuth 2.0
- Rate limiting en endpoints publicos de reserva y busqueda por email
- CRM basico: pacientes frecuentes, etiquetas, notas, control recordatorio

---

## Commits recientes

```
e864016  feat: cancelacion de citas, notificaciones completas y pagina mis-citas
774ffc3  feat: corregir nombres de usuarios y permitir cambio de clave desde dashboard
1ef3567  feat: landing page, availability dots, reminder cron y email templates
8000de8  fix: aclarar acceso email y usuario nuevo
f8d63fb  fix: hacer clickeables acciones admin
```
