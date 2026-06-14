# AgendaSalud

SaaS de agendamiento medico para centros de salud, profesionales y pacientes. Permite publicar profesionales, configurar disponibilidad, reservar horas online, sincronizar con Google Calendar mediante service account, enviar correos de confirmacion/cancelacion/recordatorio y administrar centros/usuarios desde un panel interno.

URL de produccion: https://agendasalud.vercel.app

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth
- Sesion HMAC local para usuarios internos/admin
- Google Sheets API como base MVP
- Google Calendar API
- Resend para email
- Vercel Cron para recordatorios
- Zod para validacion
- Rate limiting interno en endpoints sensibles

## Perfiles

- Paciente: agenda, consulta y cancela citas sin registro, usando email.
- Profesional: gestiona agenda, disponibilidad, citas manuales y estadisticas de su centro.
- Administrador: administra centros, profesionales, usuarios y configuracion publica.

Regla critica: la informacion publica visible para pacientes solo la edita Admin. El profesional no edita su ficha publica.

## Rutas principales

Publicas:

- `/`
- `/agendar`
- `/agendar/[professionalSlug]`
- `/mis-citas`
- `/cancelar/[id]`
- `/login`
- `/cambiar-contrasena`

Dashboard:

- `/dashboard`
- `/dashboard/agenda`
- `/dashboard/citas`
- `/dashboard/disponibilidad`
- `/dashboard/nueva-cita`
- `/dashboard/configuracion`
- `/dashboard/perfil`
- `/dashboard/admin`

## Variables de entorno

Usa `.env.example` como base:

```bash
cp .env.example .env.local
```

Variables relevantes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `ADMIN_SESSION_SECRET`
- `BOOTSTRAP_SECRET`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_CALENDAR_ID`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`
- `DEFAULT_CENTER_ID`

No subir credenciales reales al repositorio.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:3000
```

## Verificacion

Antes de cerrar cambios:

```bash
npm run lint
npm run build
```

No hay suite automatizada de tests aun. La auditoria recomienda agregar pruebas para disponibilidad, reservas y permisos.

## Arquitectura de datos

Google Sheets MVP:

- `professionals`
- `appointments`
- `availability`
- `centers`
- `users`
- `remindersSent`

La estructura completa esta documentada en `CODEX.md`.

## Auditoria

La Fase 0 esta documentada en:

```text
docs/AUDIT.md
```

La revision de proyectos open source de agendamiento esta documentada en:

```text
docs/GITHUB_SCHEDULING_REVIEW.md
```

Resumen: el producto es funcional como beta, pero antes de escalar se recomienda priorizar rate limiting, endurecimiento de auth/sesiones, tests criticos, refactor de monolitos UI y definicion de migracion futura desde Google Sheets a una base relacional.

## Comandos utiles

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Notas operativas

- La zona horaria principal es `America/Santiago`.
- Google Calendar actual funciona con service account y calendarios compartidos.
- OAuth por profesional aun no esta implementado.
- Los emails usan Resend; si `RESEND_API_KEY` no existe, las citas no se bloquean.
- El cron de recordatorios corre cada hora en Vercel via `vercel.json`.
- El rate limiting actual es in-memory. Para escala real, migrar a Redis/Vercel KV/Unkey o persistencia transaccional.
