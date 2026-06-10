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
- Admin es el unico que asigna usuarios a centros.
- Admin puede crear centros con datos extendidos:
  - Direccion.
  - Comuna/ciudad.
  - Region.
  - Telefono.
  - Email.
- Admin ve estadisticas por centro y por profesional/usuario:
  - Pacientes hoy.
  - Atendidos.
  - No atendidos/no asiste.
  - Pendientes.
- Panel usuario permite crear citas manuales desde el dashboard. Estas se guardan en Sheets y se intentan crear en Google Calendar.
- Panel usuario permite marcar citas como completadas, canceladas o no asiste.
- Terminologia operativa:
  - Cliente = paciente/persona que solicita hora.
  - Profesional = usuario que administra su agenda, disponibilidad, citas y estadisticas.
  - Administrador = usuario que administra centros, usuarios, profesionales y estadisticas globales.
- Dashboard profesional modernizado:
  - Entrada como centro de mando de jornada.
  - Selector de fecha de trabajo.
  - Proximo paciente destacado.
  - Lista compacta de pacientes del dia con acciones Atendido/No asiste.
  - Estadisticas diarias interactivas: total, atendidos, no asiste, pendientes.
  - Panel de acciones rapidas hacia disponibilidad, cita manual y perfil publico.
  - Menu superior actualizado a `Panel profesional`.
- Dashboard profesional estilo funnel/modulos:
  - Tarjetas grandes con iconos SVG para Agenda diaria, Habilitar horarios, Crear cita manual, Estadisticas y Link clientes.
  - Cada tarjeta funciona como acceso rapido a su seccion interna.
- Regla de permisos de producto:
  - La informacion publica visible para clientes/pacientes solo puede editarla el Administrador.
  - El Profesional no puede editar foto, descripcion, especialidad publica, correo publico, telefono publico, Calendar ID ni duracion base del perfil.
  - El Profesional solo opera agenda, disponibilidad, citas manuales, estados y estadisticas.
  - El dashboard profesional muestra una tarjeta de solo lectura indicando que el perfil publico es administrado.
  - `PATCH /api/dashboard/professionals` ahora exige `requireAdmin()`; no basta con tener acceso profesional al centro.
- Login profesional:
  - Normalizado en ASCII para evitar mojibake.
  - Muestra alternativas tipo TrialNode: Codigo via WhatsApp, Codigo via Email e Ingresar con contrasena.
  - Email usa Supabase OTP/magic link hacia `/dashboard`.
  - WhatsApp queda preparado con aviso hasta conectar proveedor oficial WhatsApp Business.
- Calendarizacion automatica:
  - Primero usa `professional.calendarId`.
  - Luego `professional.email`.
  - Luego el correo del primer usuario operativo asignado al mismo centro.
  - Finalmente `GOOGLE_CALENDAR_ID`.
- La pagina publica de confirmacion usa `next/link` para navegacion interna y mantiene boton de Google Calendar para el paciente.
- Disponibilidad profesional:
  - El selector de disponibilidad ya no usa solo lunes/martes/miercoles.
  - Ahora muestra calendario mensual con seleccion por `Dia`, `Semana` o `Mes`.
  - Publicar horario crea bloques para fechas especificas (`YYYY-MM-DD`).
  - La disponibilidad publica acepta bloques por fecha exacta y mantiene compatibilidad con bloques semanales antiguos.
- Funnel publico `/agendar`:
  - Redisenado como seleccion interactiva de profesionales.
  - Tarjetas grandes con imagen/foto o avatar visual.
  - Al seleccionar un profesional aparece panel lateral con resumen y CTA `Ingresar a la agenda`.
  - El flujo directo `/agendar/[slug]` se mantiene intacto.
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
- `components/public/ProfessionalDirectoryPage.tsx`
- `app/(dashboard)/layout.tsx`
- `components/AgendaSaludLoginPage.tsx`
- `components/dashboard/ClientWorkspace.tsx`
- `components/public/PublicBookingPage.tsx`
- `lib/appointments.ts`
- `lib/auth/permissions.ts`
- `lib/availability.ts`
- `lib/validation.ts`
- `app/api/dashboard/appointments/route.ts`
- `components/admin/AdminWorkspace.tsx`

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
- El perfil publico del profesional, correo, telefono, Calendar ID y duracion base de agenda solo los edita Admin.
- Las citas se crean en Google Calendar usando `calendarId`, luego `email` del profesional, luego `GOOGLE_CALENDAR_ID`.
- Para usar el calendario del correo del profesional, compartir ese Calendar con la service account de Google.
- Hay un embudo visual en el panel profesional: agenda diaria, habilitar horarios, crear cita manual, estadisticas y link paciente.
- El panel cliente usa calendario visual para disponibilidad. Puede seleccionar fechas por dia, semana o mes y guardar bloques por fecha exacta. El backend acepta `dayOfWeek` como dia semanal legacy o como fecha `YYYY-MM-DD`.
- Solo Admin debe crear/asignar usuarios a centros. Usuarios normales no ven configuracion de centros.
- Admin maneja estadisticas por centro y por profesional.
- Usuario normal maneja agenda diaria, disponibilidad, citas manuales y estados sin salir del panel. No edita informacion publica.
- Citas manuales usan `/api/dashboard/appointments` POST y pasan por `bookAppointmentForProfessional`.
- La entrada publica `/agendar` debe sentirse como funnel visual: seleccionar profesional en tarjetas, revisar resumen y entrar a la agenda individual.
- El dashboard profesional debe priorizar la operacion diaria por sobre configuraciones: jornada, proximo paciente, estados y accesos rapidos primero; ajustes despues.
- El dashboard profesional debe tener una pantalla home con modulos visuales e iconos, inspirada en el estilo TrialNode, para entrar rapido a cada flujo.
- El login profesional debe mantener password funcional y dejar preparadas opciones de acceso sin password.
- Mantener regla admin-only: toda informacion visible para pacientes en fichas publicas de profesionales debe editarse desde Admin, no desde el panel Profesional.

Prioridades siguientes:
1. Probar flujo completo admin:
   - Crear centro.
   - Crear usuario asignado a centro.
   - Login con usuario creado.
   - Confirmar que solo ve su centro.
2. Probar flujo calendario:
   - Seleccionar un dia.
   - Seleccionar una semana.
   - Seleccionar un mes.
   - Confirmar que el link publico muestra horas solo en esas fechas.
3. Probar cita manual:
   - Crear cita desde dashboard usuario.
   - Confirmar registro en Sheets.
   - Confirmar evento en Calendar del correo del usuario/centro.
4. Probar agendamiento real con un calendario compartido del profesional.
5. Mejorar recuperacion/cambio de contrasena para usuarios internos.
6. Agregar auditoria de acciones admin y cambios de agenda.
7. Agregar pruebas basicas de APIs criticas.
8. Mantener accesibilidad WCAG, mensajes claros y diseno HealthTech.

Antes de terminar:
- Ejecuta npm run lint.
- Ejecuta npm run build.
- Deja un resumen de cambios.
- Actualiza este HANDOFF_CLAUDE_CODE.md con el nuevo estado.
```
