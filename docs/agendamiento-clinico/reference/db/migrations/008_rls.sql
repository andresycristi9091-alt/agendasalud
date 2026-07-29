-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY  ★ INVARIANTE I-13 ★
--
-- Defensa en profundidad. El guard de NestJS es la primera línea;
-- RLS es la que sigue bloqueando si el guard tiene un bug o alguien
-- consulta la BD directamente con las credenciales de la aplicación.
--
-- La app fija estas variables al inicio de cada transacción:
--   SET LOCAL app.user_id        = '<uuid>';
--   SET LOCAL app.roles          = 'practitioner,scheduler';
--   SET LOCAL app.location_scope = '<uuid>,<uuid>';   -- vacío = todas
--   SET LOCAL app.practitioner_id= '<uuid>';          -- si aplica
--   SET LOCAL app.break_glass    = 'off';
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION app_setting(key text)
RETURNS text AS $$
  SELECT nullif(current_setting(key, true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_has_role(r text)
RETURNS boolean AS $$
  SELECT coalesce(app_setting('app.roles'), '') ~ ('(^|,)' || r || '(,|$)');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_location_scope()
RETURNS uuid[] AS $$
  SELECT CASE
    WHEN app_setting('app.location_scope') IS NULL THEN NULL
    ELSE string_to_array(app_setting('app.location_scope'), ',')::uuid[]
  END;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_in_scope(loc uuid)
RETURNS boolean AS $$
  SELECT app_location_scope() IS NULL      -- NULL = acceso a todas las sedes
      OR loc = ANY(app_location_scope())
      OR app_setting('app.break_glass') = 'on';
$$ LANGUAGE sql STABLE;


-- ── appointment ────────────────────────────────────────────────────

ALTER TABLE appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment FORCE ROW LEVEL SECURITY;

CREATE POLICY appointment_admin_all ON appointment
  FOR ALL TO app_user
  USING (app_has_role('admin'))
  WITH CHECK (app_has_role('admin'));

CREATE POLICY appointment_staff_scope ON appointment
  FOR ALL TO app_user
  USING (
    (app_has_role('reception') OR app_has_role('scheduler') OR app_has_role('service_lead'))
    AND app_in_scope(location_id)
  )
  WITH CHECK (
    (app_has_role('reception') OR app_has_role('scheduler') OR app_has_role('service_lead'))
    AND app_in_scope(location_id)
  );

CREATE POLICY appointment_practitioner_own ON appointment
  FOR ALL TO app_user
  USING (
    app_has_role('practitioner')
    AND (practitioner_id = app_setting('app.practitioner_id')::uuid
         OR app_setting('app.break_glass') = 'on')
  )
  WITH CHECK (
    app_has_role('practitioner')
    AND practitioner_id = app_setting('app.practitioner_id')::uuid
  );

-- El paciente ve las suyas y las de sus dependientes con permiso vigente.
CREATE POLICY appointment_patient_own ON appointment
  FOR SELECT TO app_user
  USING (
    app_has_role('patient')
    AND (
      patient_id = app_setting('app.patient_id')::uuid
      OR EXISTS (
        SELECT 1 FROM patient_relationship pr
         WHERE pr.caregiver_id = app_setting('app.patient_id')::uuid
           AND pr.dependent_id = appointment.patient_id
           AND pr.can_book
           AND pr.verified_at IS NOT NULL
           AND (pr.valid_until IS NULL OR pr.valid_until >= CURRENT_DATE)
      )
    )
  );

-- El auditor lee todo pero no escribe nada.
CREATE POLICY appointment_auditor_read ON appointment
  FOR SELECT TO app_user
  USING (app_has_role('auditor'));


-- ── patient ────────────────────────────────────────────────────────

ALTER TABLE patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient FORCE ROW LEVEL SECURITY;

CREATE POLICY patient_admin_all ON patient
  FOR ALL TO app_user
  USING (app_has_role('admin')) WITH CHECK (app_has_role('admin'));

CREATE POLICY patient_staff_read ON patient
  FOR SELECT TO app_user
  USING (
    app_has_role('reception') OR app_has_role('scheduler')
    OR app_has_role('auditor')
    -- El clínico ve al paciente si tiene o tuvo una cita con él.
    OR (app_has_role('practitioner') AND EXISTS (
          SELECT 1 FROM appointment a
           WHERE a.patient_id = patient.id
             AND a.practitioner_id = app_setting('app.practitioner_id')::uuid))
    OR app_setting('app.break_glass') = 'on'
  );

CREATE POLICY patient_self ON patient
  FOR SELECT TO app_user
  USING (app_has_role('patient') AND id = app_setting('app.patient_id')::uuid);


-- ── consent y notification ─────────────────────────────────────────

ALTER TABLE consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent FORCE ROW LEVEL SECURITY;

CREATE POLICY consent_scope ON consent
  FOR ALL TO app_user
  USING (app_has_role('admin') OR app_has_role('auditor')
         OR app_has_role('reception') OR app_has_role('scheduler')
         OR (app_has_role('patient') AND patient_id = app_setting('app.patient_id')::uuid))
  WITH CHECK (app_has_role('admin') OR app_has_role('reception')
              OR app_has_role('scheduler') OR app_has_role('patient'));

ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification FORCE ROW LEVEL SECURITY;

CREATE POLICY notification_scope ON notification
  FOR ALL TO app_user
  USING (app_has_role('admin') OR app_has_role('system') OR app_has_role('auditor'))
  WITH CHECK (app_has_role('admin') OR app_has_role('system'));


-- ── Permisos base del rol de aplicación ────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Excepción: audit_log ya revocó UPDATE/DELETE en la migración 006.
REVOKE UPDATE, DELETE ON audit_log FROM app_user;

-- migrate:down

DROP POLICY IF EXISTS notification_scope ON notification;
ALTER TABLE notification DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consent_scope ON consent;
ALTER TABLE consent DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patient_self ON patient;
DROP POLICY IF EXISTS patient_staff_read ON patient;
DROP POLICY IF EXISTS patient_admin_all ON patient;
ALTER TABLE patient DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointment_auditor_read ON appointment;
DROP POLICY IF EXISTS appointment_patient_own ON appointment;
DROP POLICY IF EXISTS appointment_practitioner_own ON appointment;
DROP POLICY IF EXISTS appointment_staff_scope ON appointment;
DROP POLICY IF EXISTS appointment_admin_all ON appointment;
ALTER TABLE appointment DISABLE ROW LEVEL SECURITY;
DROP FUNCTION IF EXISTS app_in_scope(uuid);
DROP FUNCTION IF EXISTS app_location_scope();
DROP FUNCTION IF EXISTS app_has_role(text);
DROP FUNCTION IF EXISTS app_setting(text);
