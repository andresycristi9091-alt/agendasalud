# AgendaSalud - Handoff para Claude Code

## Estado actual

Proyecto Next.js App Router + TypeScript + Tailwind para AgendaSalud/NeuroPlus.

Ultimo foco implementado:

- Admin puede crear centros y se asegura centro base `NeuroPlus`.
- Admin puede crear usuarios internos de AgendaSalud aunque falte `SUPABASE_SERVICE_ROLE_KEY`.
- Login acepta usuarios internos creados por Admin si Supabase Auth no los reconoce.
- Usuarios internos guardan rol y `centerId`; usuarios normales ven solo su centro.
- Usuarios operativos sin centro explicito caen por defecto en `center-neuroplus` (`DEFAULT_CENTER_ID` opcional).
- Al crear usuarios normales desde Admin, si no se selecciona centro, se asigna `center-neuroplus`.
- Admin precarga NeuroPlus como centro por defecto para crear usuarios/profesionales cuando existe.
- Las citas se intentan calendarizar en este orden:
  1. `professional.calendarId`.
  2. `professional.email`.
  3. `GOOGLE_CALENDAR_ID`.
- Para calendarizar en el correo del profesional, ese calendario debe estar compartido con la service account de Google con permiso de crear/modificar eventos.
- Panel cliente permite editar perfil visible del profesional:
  - Tipo de profesional.
  - Especialidad.
  - Foto.
  - Correo profesional.
  - Telefono profesional.
  - Google Calendar ID opcional.
  - Descripcion publica.
  - Duracion base de atencion.
- Duraciones disponibles de agenda: 10, 15, 30, 45 y 60 minutos.
- Panel cliente ahora muestra un embudo operacional:
  1. Perfil visible.
  2. Agenda publicada.
  3. Link del paciente.
  4. Calendar conectado.
- Admin permite configurar correo, telefono, Calendar ID y duracion base del profesional.
- La pagina publica de confirmacion usa `next/link` para navegacion interna y mantiene boton de Google Calendar para el paciente.
- Hotfix produccion:
  - `ADMIN_SESSION_SECRET` ya no provoca 500 si falta; usa fallback estable para no romper `/dashboard`.
  - `ADMIN_EMAILS` ya no provoca 500 si falta; retorna lista vacia y respeta `user_metadata.role`.

## Nota operativa importante

En el entorno local actual `.env.local` solo contiene variables publicas de Supabase. No estan cargadas las variables `GOOGLE_SHEETS_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `ADMIN_SESSION_SECRET`, `ADMIN_EMAILS`, `BOOTSTRAP_SECRET` ni `SUPABASE_SERVICE_ROLE_KEY`. Por eso desde local no se puede escribir directamente en Google Sheets ni administrar usuarios Supabase reales.

Si se necesita asignar manualmente `andres.ruizvarela@gmail.com` a NeuroPlus en la data real, hacerlo desde `/dashboard/admin` en Vercel o agregar `center-neuroplus` en su metadata/hoja `users`. El codigo ya protege el caso sin centro usando el default `center-neuroplus`.

Para produccion sigue siendo recomendable definir:
- `ADMIN_SESSION_SECRET`
- `ADMIN_EMAILS`
- `BOOTSTRAP_SECRET`
- `DEFAULT_CENTER_ID=center-neuroplus`

## Archivos clave modificados

- `lib/google/sheets.ts`
- `lib/auth/password.ts`
- `lib/auth/local-admin-session.ts`
- `lib/auth/admin.ts`
- `app/api/auth/login/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/centers/route.ts`
- `app/api/dashboard/professionals/route.ts`
- `components/AgendaSaludLoginPage.tsx`
- `components/admin/AdminWorkspace.tsx`
- `components/dashboard/ClientWorkspace.tsx`
- `components/public/PublicBookingPage.tsx`
- `lib/appointments.ts`
- `lib/auth/permissions.ts`

## Verificacion ejecutada

```bash
npm run lint
npm run build
```

Ambos pasaron antes de crear este handoff. Ejecutar nuevamente si se hacen cambios posteriores.

## Prompt sugerido para Claude Code

```txt
Actua como senior full-stack developer experto en Next.js, TypeScript, Tailwind, Supabase, Google Sheets y SaaS HealthTech.

Continua el proyecto AgendaSalud en C:\Users\snowc\proyectos\agendasalud.

Contexto:
- Es una plataforma de agendamiento medico multi-centro.
- Admin debe poder crear centros, profesionales y usuarios.
- Usuarios normales deben ver y administrar solo profesionales/agenda de su centro.
- NeuroPlus es el centro base MVP: `center-neuroplus`.
- Si un usuario normal no tiene centro, el sistema usa `DEFAULT_CENTER_ID` o `center-neuroplus`.
- Si no existe SUPABASE_SERVICE_ROLE_KEY, el sistema usa usuarios internos en Google Sheets.
- El login primero intenta Supabase Auth y luego usuarios internos por /api/auth/login.
- Los usuarios internos guardan rol y centerId en cookie firmada.
- El panel cliente permite editar perfil publico del profesional, correo, telefono, Calendar ID y duracion base de agenda.
- Las citas se crean en Google Calendar usando `calendarId`, luego `email` del profesional, luego `GOOGLE_CALENDAR_ID`.
- Para usar el calendario del correo del profesional, compartir ese Calendar con la service account de Google.
- Hay un embudo visual en el panel cliente: perfil visible, agenda publicada, link paciente y Calendar conectado.

Prioridades siguientes:
1. Probar flujo completo admin:
   - Crear centro.
   - Crear usuario asignado a centro.
   - Login con usuario creado.
   - Confirmar que solo ve su centro.
2. Probar agendamiento real con un calendario compartido del profesional.
3. Mejorar recuperacion/cambio de contrasena para usuarios internos.
4. Agregar auditoria de acciones admin y cambios de agenda.
5. Agregar pruebas basicas de APIs criticas.
6. Mantener accesibilidad WCAG, mensajes claros y diseno HealthTech.

Antes de terminar:
- Ejecuta npm run lint.
- Ejecuta npm run build.
- Deja un resumen de cambios.
- Actualiza este HANDOFF_CLAUDE_CODE.md con el nuevo estado.
```
