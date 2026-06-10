# AgendaSalud - contexto para Claude

AgendaSalud es una app HealthTech/SaaS en Next.js App Router para agendamiento medico.

## Producto

Hay dos paginas principales:

- Pagina usuario/paciente multiprofesional: `/agendar`
- Funnel por profesional: `/agendar/[slug]`
- Pagina cliente/profesional: `/dashboard`

El dashboard esta compactado en una sola experiencia cliente: selector de profesional, metricas, link publico, disponibilidad y citas.

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
- `components/public/ProfessionalDirectoryPage.tsx`: portada multiprofesional NeuroPlus.
- `components/dashboard/ClientWorkspace.tsx`: dashboard cliente/profesional.
- `components/admin/AdminWorkspace.tsx`: panel Admin multi-centro.
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
- `SUPABASE_SERVICE_ROLE_KEY` requerido para crear usuarios desde Admin.
- `ADMIN_EMAILS` lista de correos admin separados por coma.

## Admin

Acceso inicial pedido por el cliente:

- usuario: `admin`
- contrasena: `admin`

El login convierte ese usuario a `admin@neuroplus.local` y ejecuta `/api/admin/bootstrap`, que crea/actualiza el usuario usando `SUPABASE_SERVICE_ROLE_KEY`.

El Admin puede:

- Crear centros independientes.
- Crear/editar/desactivar profesionales y asignarlos a un centro.
- Agregar `professionalType` y `photoUrl`.
- Crear usuarios.
- Asignar rol `admin` o `user`.
- Asignar usuarios a un centro.

Un usuario con rol `user` solo debe operar el centro asignado.

## Verificacion

Antes de terminar cambios:

```bash
npm.cmd run build
```

Si se toca UI publica o dashboard, revisar:

- `/agendar`
- `/agendar/dr-garcia`
- `/dashboard`

## Google Sheets: profesionales

La hoja `professionals` soporta estas columnas base:

`id, slug, name, specialty, centerName, email, phone, calendarId, publicDescription, appointmentDurationDefault, timezone, active, createdAt, updatedAt`

Y estas columnas opcionales para NeuroPlus:

- `professionalType`: tipo visible de profesional, por ejemplo `Neurologo`, `Psicologa`, `Fonoaudiologa`.
- `photoUrl`: URL publica de una imagen del profesional.
- `centerId`: ID del centro al que pertenece.

Si no hay `photoUrl`, la UI muestra iniciales profesionales.

@AGENTS.md
