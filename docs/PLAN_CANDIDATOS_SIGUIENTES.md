# Plan de implementacion - candidatos siguientes

Fecha: 2026-07-28. Basado en el estado post-commit `4033d84` (tests Vitest + booking rules).

Candidatos cubiertos:

- Fase A: recuperacion de contrasena para usuarios internos (prioridad 5 del handoff).
- Fase B: excepciones de disponibilidad - feriados y bloqueos puntuales (pendiente de booking rules).
- Fase C: auditoria de acciones admin y cambios de agenda (prioridad 6 del handoff).

Orden recomendado: A -> B -> C. A resuelve un dolor real de usuarios (hoy un usuario interno
bloqueado depende del Admin), B completa la funcionalidad de agenda que ya se vende, y C es
observabilidad interna que no bloquea a nadie.

Regla transversal: cada fase termina con `npm run lint`, `npm test`, `npm run build`,
actualizacion de `HANDOFF_CLAUDE_CODE.md` y un commit propio.

---

## Fase A - Recuperacion de contrasena (usuarios internos)

### Contexto actual

- Usuarios internos viven en la hoja `users!A:I` con `passwordHash` PBKDF2 (`lib/auth/password.ts`).
- El login interno pasa por `POST /api/auth/login`; ya tiene rate limiting.
- Ya existe infraestructura de email con Resend en `lib/email.ts`.
- Existe `/cambiar-contrasena` para cambio autenticado; falta el flujo "olvide mi clave".

### Diseno

Nueva hoja `passwordResets` en Google Sheets:

`id, email, tokenHash, expiresAt, usedAt, createdAt`

Flujo:

1. `POST /api/auth/password-reset/request` (nuevo):
   - Rate limit estricto: 3 solicitudes por 15 min por IP.
   - Busca el usuario interno por email. Exista o no, responde siempre el mismo 200 generico
     ("Si el correo existe, enviaremos instrucciones") para no filtrar cuentas.
   - Genera token aleatorio de 32 bytes (`randomBytes`), guarda solo su hash SHA-256 con
     expiracion de 45 minutos e invalida tokens previos del mismo email.
   - Envia email via Resend con link `NEXT_PUBLIC_APP_URL/restablecer-contrasena?token=...`.
2. `POST /api/auth/password-reset/confirm` (nuevo):
   - Rate limit: 5 por 15 min por IP.
   - Valida token: hash coincide, no expirado, no usado.
   - Valida nueva clave con `StrongPasswordSchema`.
   - Actualiza `passwordHash` con PBKDF2 (esto ademas migra hashes legacy SHA-256).
   - Marca `usedAt` y responde exito. Si hay cuenta Supabase equivalente y existe
     `SUPABASE_SERVICE_ROLE_KEY`, sincroniza la clave con `auth.admin.updateUserById` (best effort).

### Archivos

| Archivo | Accion |
|---|---|
| `lib/auth/password-reset.ts` | NUEVO: logica pura (generar token, hashear, validar expiracion/uso) |
| `lib/google/sheets.ts` | Agregar CRUD de hoja `passwordResets` |
| `lib/email.ts` | Agregar `sendPasswordResetEmail` |
| `app/api/auth/password-reset/request/route.ts` | NUEVO |
| `app/api/auth/password-reset/confirm/route.ts` | NUEVO |
| `app/(public)/recuperar-contrasena/page.tsx` | NUEVO: formulario de solicitud |
| `app/(public)/restablecer-contrasena/page.tsx` | NUEVO: formulario de nueva clave con token |
| `components/AgendaSaludLoginPage.tsx` | Link "Olvidaste tu contrasena?" |
| `tests/password-reset.test.ts` | NUEVO: TDD de la logica pura |

### Seguridad (checklist)

- Nunca guardar ni loggear el token en claro; solo el hash.
- Token de un solo uso; invalidar los anteriores al emitir uno nuevo.
- Respuesta generica en request (sin enumeracion de cuentas).
- Rate limiting en ambos endpoints.
- No aplicar a `admin@agendasalud.cl` cambios via este flujo si se decide mantenerlo solo-bootstrap
  (decision a confirmar; default propuesto: permitido, con notificacion por email).

### Estimacion

1 sesion. Riesgo bajo. Sin variables de entorno nuevas (usa Resend y APP_URL existentes).

---

## Fase B - Excepciones de disponibilidad (feriados y bloqueos)

### Contexto actual

- `getAvailableSlotsForDate` (lib/availability.ts) ya combina bloques, citas de Sheets,
  FreeBusy de Calendar y booking rules.
- No hay forma de bloquear un dia puntual (feriado, vacaciones, licencia) sin borrar los
  bloques semanales legacy.

### Diseno

Nueva hoja `availabilityExceptions`:

`id, scope, scopeId, date, startTime, endTime, reason, createdAt`

- `scope`: `professional` | `center` | `all`.
- `scopeId`: id del profesional o del centro (vacio para `all`).
- `startTime`/`endTime` vacios = dia completo bloqueado.
- Con horas = bloqueo parcial (ej. "no atiendo de 13:00 a 15:00 el 2026-09-18").

Logica en `lib/availability-exceptions.ts` (pura, testeable):

- `getExceptionsForDate(exceptions, professional, date)`: filtra por fecha y alcance
  (profesional especifico, su centro, o global).
- `exceptionsToBusyIntervals(exceptions, date)`: dia completo -> intervalo 00:00-23:59;
  parcial -> intervalo con `chileLocalDateTimeToISO`.

Integracion:

- En `getAvailableSlotsForDate`: si hay excepcion de dia completo, retornar todos los slots
  como no disponibles (o lista vacia); si es parcial, sumar los intervalos al arreglo
  `blockedIntervals` existente (ya soporta buffer).
- En `bookAppointment` (flujo publico): re-chequear excepciones antes de confirmar, igual que
  las booking rules. El flujo manual del profesional queda exento (puede sobreescribir su bloqueo).

UI:

- Dashboard profesional, seccion Disponibilidad: sub-seccion "Bloqueos" con:
  - Crear bloqueo: fecha + opcional rango horario + motivo.
  - Lista de bloqueos futuros con boton eliminar (con confirmacion, patron ya usado).
- Admin: misma gestion pero pudiendo elegir profesional, centro o todos (feriado nacional).
- API: `GET/POST /api/dashboard/availability/exceptions` y `DELETE .../exceptions/[id]`,
  protegidos con `requireProfessionalAccess` / `requireAdmin` segun alcance.

Feriados chilenos: NO integrar API externa en esta fase. El Admin los carga como excepciones
`all` manualmente. Dejar anotado como mejora futura (API feriados.cl o tabla anual).

### Archivos

| Archivo | Accion |
|---|---|
| `lib/availability-exceptions.ts` | NUEVO: logica pura |
| `lib/google/sheets.ts` | CRUD hoja `availabilityExceptions` |
| `lib/availability.ts` | Integrar excepciones a `blockedIntervals` |
| `lib/appointments.ts` | Re-check en flujo publico |
| `lib/validation.ts` | `AvailabilityExceptionSchema` |
| `app/api/dashboard/availability/exceptions/route.ts` | NUEVO GET/POST |
| `app/api/dashboard/availability/exceptions/[id]/route.ts` | NUEVO DELETE |
| `components/dashboard/ClientWorkspace.tsx` | UI bloqueos profesional |
| `components/admin/AdminWorkspace.tsx` | UI bloqueos admin |
| `tests/availability-exceptions.test.ts` | NUEVO: TDD logica pura + integracion con mocks |

### Estimacion

1-2 sesiones (la UI en los dos workspaces es lo mas largo). Riesgo medio: tocar
`getAvailableSlotsForDate` requiere mantener los 6 tests de integracion existentes en verde.

---

## Fase C - Auditoria de acciones admin y agenda

### Contexto actual

- No existe registro de quien hizo que. Con multiples `center_admin` futuros, es necesario
  para soporte y compliance (Ley 19.628).

### Diseno

Nueva hoja `auditLog`:

`id, timestamp, actorEmail, actorRole, action, entityType, entityId, details, ip`

- `action`: verbo corto (`create`, `update`, `delete`, `deactivate`, `status_change`, `login_failed`, ...).
- `entityType`: `user`, `professional`, `center`, `availability`, `appointment`, `session`.
- `details`: JSON compacto con los campos cambiados (sin datos sensibles: nunca claves ni tokens;
  email de paciente solo truncado, ej. `m***@dominio.cl`).

`lib/audit.ts` (NUEVO):

- `logAuditEvent(event)`: fire-and-forget con `.catch(console.warn)` - NUNCA bloquea ni
  hace fallar la operacion principal si Sheets falla.
- `sanitizeAuditDetails(obj)`: pura y testeable; remueve/enmascara campos sensibles.

Puntos de instrumentacion (llamada de 1 linea en cada handler ya existente):

- `POST/PATCH/DELETE /api/admin/users*` - altas, ediciones, cambios de rol/centro, borrados.
- `POST/PATCH/DELETE /api/admin/professionals*` - idem + quitar del directorio.
- `POST/PATCH /api/admin/centers*`.
- `PATCH /api/dashboard/appointments/[id]` - cambios de estado de cita.
- `POST/DELETE /api/dashboard/availability*` - publicacion/eliminacion de horarios y bloqueos.
- `POST /api/admin/login` y `POST /api/auth/login` - solo intentos fallidos (exito genera ruido).

UI (MVP solo lectura):

- Nueva pestana "Actividad" en `AdminWorkspace`: tabla con ultimos 100 eventos,
  filtro por tipo de entidad y por actor. Sin edicion ni borrado desde UI.
- `GET /api/admin/audit?entityType=&limit=` con `requireAdmin()`.

### Archivos

| Archivo | Accion |
|---|---|
| `lib/audit.ts` | NUEVO |
| `lib/google/sheets.ts` | append + lectura hoja `auditLog` |
| `app/api/admin/audit/route.ts` | NUEVO GET |
| Rutas listadas arriba | +1 linea `logAuditEvent(...)` cada una |
| `components/admin/AdminWorkspace.tsx` | Pestana Actividad |
| `tests/audit.test.ts` | NUEVO: sanitizacion y formato de eventos |

### Estimacion

1 sesion. Riesgo bajo (aditivo, fire-and-forget). Cuidado unico: no degradar latencia de las
rutas admin - el log va sin `await` en el camino critico.

---

## Fuera de alcance de este plan (siguientes en la cola)

- Migrar rate limiting a Redis/Vercel KV/Unkey (prioridad 9) - requiere decision de proveedor.
- Cobertura de tests para rutas API completas (extension de prioridad 7).
- Integracion automatica de feriados chilenos (mejora de Fase B).

## Verificacion por fase

```bash
npm run lint
npm test
npm run build
```

Mas prueba manual en `/agendar`, `/agendar/dr-garcia` y `/dashboard` cuando se toque UI,
y validacion en Vercel para los flujos que dependen de Google Sheets/Resend.
