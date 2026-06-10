# AgendaSalud - contexto para Claude

AgendaSalud es una app HealthTech/SaaS en Next.js App Router para agendamiento medico.

## Producto

Hay dos paginas principales:

- Pagina usuario/paciente: `/agendar/dr-garcia`
- Pagina cliente/profesional: `/dashboard`

El dashboard esta compactado en una sola experiencia cliente: metricas, link publico, disponibilidad y citas.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth para login del profesional
- Google Sheets como base tipo Excel
- Google Calendar para eventos y FreeBusy
- Zona horaria principal: `America/Santiago`

## Reglas importantes

- No exponer credenciales Google en frontend.
- Toda integracion Google vive server-side en `lib/google/*` y rutas API.
- Mantener solo dos experiencias principales: usuario y cliente.
- No pedir datos clinicos sensibles al paciente.
- La hora debe interpretarse como hora chilena, no UTC del servidor.
- Evitar emojis en codigo nuevo: antes hubo problemas de encoding.

## Archivos clave

- `components/public/PublicBookingPage.tsx`: pagina publica de agendamiento.
- `components/dashboard/ClientWorkspace.tsx`: dashboard cliente/profesional.
- `lib/date.ts`: utilidades de hora chilena.
- `lib/availability.ts`: generacion de slots disponibles.
- `lib/appointments.ts`: flujo anti doble reserva + Calendar + Sheets.
- `lib/google/sheets.ts`: lectura/escritura Google Sheets.
- `lib/google/calendar.ts`: Google Calendar y FreeBusy.

## Variables necesarias

Ver `.env.example`.

Variables criticas en Vercel:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_CALENDAR_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Verificacion

Antes de terminar cambios:

```bash
npm.cmd run build
```

Si se toca UI publica o dashboard, revisar:

- `/agendar/dr-garcia`
- `/dashboard`

@AGENTS.md
