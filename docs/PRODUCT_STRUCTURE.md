# AgendaSalud - estructura SaaS objetivo

Este documento traduce el prompt `PROMPT_Plataforma_Agenda_Medica.md` a la realidad actual del proyecto.

## Roles del producto

- `patient`: paciente que busca, agenda, revisa y cancela sus citas.
- `professional`: profesional de salud que opera agenda, disponibilidad, citas y estadisticas.
- `center_admin`: administrador de un centro medico. Fase siguiente; hoy el super admin realiza esta operacion.
- `super_admin`: operador de plataforma. En este MVP es solo `admin@agendasalud.cl`.

Regla vigente:

- El unico administrador real es `admin@agendasalud.cl`.
- Cualquier otro usuario se trata como usuario operativo aunque en la base aparezca con rol `admin`.
- `admin@agendasalud.cl` no se puede eliminar, desactivar ni cambiar de correo desde API/UI.

## Modulos implementados hoy

### Landing publica

- Hero comercial con CTAs separados para paciente, profesional y demo.
- Flujo paciente/profesional en 3 pasos.
- Beneficios por perfil.
- Bloque de IA preparada.
- Testimonios placeholder para piloto.
- Seguridad/privacidad.
- Planes SaaS preparados.
- CTA final.

### Reserva online

- Directorio publico `/agendar`.
- Funnel por profesional `/agendar/[slug]`.
- Calendario visual, seleccion de horario, formulario breve y confirmacion.
- Ficha de atencion, privacidad, FAQ y aviso de no urgencias.
- Validacion anti doble reserva en backend mediante recalculo de disponibilidad y lock local.

### Profesional

- Dashboard operacional.
- Agenda diaria.
- Crear cita manual.
- Disponibilidad visual por dia, semana o mes.
- Estados de cita.
- Cambio de contrasena.

### Super Admin

- Centros.
- Profesionales.
- Usuarios operativos.
- Estadisticas por centro/profesional.
- Edicion/eliminacion de profesionales.
- Proteccion del admin principal.

## Fases siguientes recomendadas

### Fase 1.1 - auth y pacientes

- Registro real de pacientes.
- Verificacion de correo propia con token hash y expiracion.
- Perfil de paciente.
- Preferencias de recordatorio.
- Soft delete.

### Fase 1.2 - centro admin

- Separar `center_admin` de `super_admin`.
- Panel de centro con profesionales, citas, pacientes y reportes.
- Auditoria de cambios administrativos.

### Fase 2 - agenda avanzada

- Vista semanal y mensual operativa.
- Bloqueos manuales.
- Excepciones positivas.
- Reagendamiento.
- Motivos de cancelacion.

### Fase 3 - Google Calendar OAuth

- Conectar Google Calendar por OAuth del profesional.
- Guardar tokens cifrados.
- Seleccion de calendario.
- Sync logs y reintentos.

### Fase 4 - IA

- Badge heuristico de riesgo de inasistencia.
- Sugerencia de horarios.
- Resumen semanal.
- Asistente interno de agenda sin exponer datos clinicos.

### Fase 5 - negocio

- Planes y limites por centro.
- Modulo financiero.
- Exportaciones CSV/PDF.
- Pagos online.

## Principios de implementacion

- No pedir datos clinicos sensibles en formularios publicos.
- Nunca afirmar cumplimiento normativo no implementado.
- Separar permisos en backend, no solo en frontend.
- Mantener `America/Santiago` como timezone base.
- Preferir flujos mobile-first y de maximo 4 pasos.
- Registrar errores de sincronizacion sin exponer secretos ni PII innecesaria.
