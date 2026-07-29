# F1-09 · Autorización, RLS y auditoría

**Riesgo:** ALTO · **Depende de:** F1-02

## Objetivo

Que un usuario nunca vea datos fuera de su ámbito, que el acceso de emergencia
sea posible pero auditado, y que el registro de accesos sea inalterable.

## Alcance

- Integración OIDC, MFA obligatorio para roles con acceso clínico
- Guard de NestJS con RBAC + ABAC (rol × sede × especialidad)
- Helper de transacción que fija `SET LOCAL app.*` para activar las políticas RLS
- Break-the-glass: acceso fuera de ámbito, permitido con justificación obligatoria,
  alerta inmediata al oficial de privacidad, registro en `audit_log`
- Interceptor `@AuditsRead()` para lecturas de datos sensibles
- Job diario de verificación de la cadena de hashes de `audit_log`
- Endpoint de "registro de accesos" para el titular de los datos

## Criterios de aceptación

- [ ] Matriz completa rol × operación × ámbito probada en integración
- [ ] **Prueba con el guard deshabilitado**: RLS sigue bloqueando el acceso fuera
      de ámbito. Esta es la prueba que demuestra defensa en profundidad.
- [ ] `UPDATE` y `DELETE` sobre `audit_log` con `app_user` fallan
- [ ] Alterar una fila de la cadena rompe la verificación diaria
- [ ] Break-the-glass sin justificación es rechazado
- [ ] Break-the-glass genera alerta en menos de 60 s
- [ ] Toda lectura de ficha de paciente queda registrada con actor y momento
- [ ] Ningún dato personal aparece en logs (prueba que grepea la salida)

## Invariantes

I-09, I-10, I-11, I-13

## Prompt sugerido

> Implementa autorización y auditoría. Empieza por la prueba de defensa en
> profundidad: una prueba de integración que deshabilita el guard de NestJS y
> verifica que RLS bloquea igual. Si esa prueba pasa trivialmente, RLS está mal
> configurado.
