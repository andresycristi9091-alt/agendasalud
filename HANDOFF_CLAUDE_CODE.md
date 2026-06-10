# AgendaSalud - Handoff para Claude Code

## Estado actual

Proyecto Next.js App Router + TypeScript + Tailwind para AgendaSalud/NeuroPlus.

Ultimo foco implementado:

- Admin puede crear centros y se asegura centro base `NeuroPlus`.
- Admin puede crear usuarios internos de AgendaSalud aunque falte `SUPABASE_SERVICE_ROLE_KEY`.
- Login acepta usuarios internos creados por Admin si Supabase Auth no los reconoce.
- Usuarios internos guardan rol y `centerId`; usuarios normales ven solo su centro.
- Panel cliente permite editar perfil visible del profesional:
  - Tipo de profesional.
  - Especialidad.
  - Foto.
  - Google Calendar ID.
  - Descripcion publica.
  - Duracion base de atencion.
- Duraciones disponibles de agenda: 10, 15, 30, 45 y 60 minutos.

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
- Si no existe SUPABASE_SERVICE_ROLE_KEY, el sistema usa usuarios internos en Google Sheets.
- El login primero intenta Supabase Auth y luego usuarios internos por /api/auth/login.
- Los usuarios internos guardan rol y centerId en cookie firmada.
- El panel cliente permite editar perfil publico del profesional y su duracion base de agenda.

Prioridades siguientes:
1. Probar flujo completo admin:
   - Crear centro.
   - Crear usuario asignado a centro.
   - Login con usuario creado.
   - Confirmar que solo ve su centro.
2. Mejorar recuperacion/cambio de contrasena para usuarios internos.
3. Agregar auditoria de acciones admin y cambios de agenda.
4. Agregar pruebas basicas de APIs criticas.
5. Mantener accesibilidad WCAG, mensajes claros y diseno HealthTech.

Antes de terminar:
- Ejecuta npm run lint.
- Ejecuta npm run build.
- Deja un resumen de cambios.
- Actualiza este HANDOFF_CLAUDE_CODE.md con el nuevo estado.
```
