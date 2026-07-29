-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- DEMANDA: citas
--
-- NOTA DE DISEÑO IMPORTANTE — particionamiento:
-- PostgreSQL 16 NO admite restricciones EXCLUDE sobre tablas particionadas.
-- Como la garantía de no doble reserva (I-02) vale más que la optimización
-- de un volumen que todavía no existe, esta tabla NO se particiona.
-- Revisar recién por encima de ~50M filas; a esa altura la alternativa es
-- archivar histórico a una tabla fría, no particionar la caliente.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE appointment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         uuid UNIQUE REFERENCES slot(id) ON DELETE RESTRICT,
  patient_id      uuid NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  practitioner_id uuid NOT NULL REFERENCES practitioner(id) ON DELETE RESTRICT,
  location_id     uuid NOT NULL REFERENCES location(id) ON DELETE RESTRICT,
  service_id      uuid NOT NULL REFERENCES service(id) ON DELETE RESTRICT,
  period          tstzrange NOT NULL,

  status          text NOT NULL DEFAULT 'booked'
    CHECK (status IN ('requested','booked','confirmed','arrived',
                      'in_progress','fulfilled','cancelled','noshow')),

  channel         text NOT NULL
    CHECK (channel IN ('patient_web','patient_app','call_center','desk','whatsapp','waitlist')),
  modality        text NOT NULL DEFAULT 'in_person'
    CHECK (modality IN ('in_person','telehealth','home')),

  reason_text     text,               -- cifrado a nivel de campo (ver 007)
  is_first_visit  boolean NOT NULL DEFAULT false,
  referral_id     uuid,

  booked_by       uuid NOT NULL,      -- puede diferir del paciente (cuidador, recepción)
  previous_appointment_id uuid REFERENCES appointment(id),  -- cadena de reagendamientos

  arrived_at      timestamptz,
  started_at      timestamptz,
  ended_at        timestamptz,

  version         integer NOT NULL DEFAULT 1,   -- para If-Match / ETag
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT appt_period_bounded CHECK (NOT isempty(period)),

  -- ★ INVARIANTE I-02 ★
  -- Un paciente no puede estar en dos citas activas a la vez.
  CONSTRAINT appt_patient_no_overlap EXCLUDE USING gist (
    patient_id WITH =,
    period     WITH &&
  ) WHERE (status IN ('booked','confirmed','arrived','in_progress'))
);

CREATE TRIGGER appointment_updated_at BEFORE UPDATE ON appointment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX appt_practitioner_day_idx ON appointment
  (practitioner_id, lower(period))
  WHERE status IN ('booked','confirmed','arrived','in_progress');

CREATE INDEX appt_patient_idx ON appointment (patient_id, lower(period) DESC);

CREATE INDEX appt_location_day_idx ON appointment (location_id, lower(period));

-- Para el job de recordatorios: citas activas en una ventana futura
CREATE INDEX appt_upcoming_idx ON appointment (lower(period))
  WHERE status IN ('booked','confirmed');


-- ═══════════════════════════════════════════════════════════════════
-- RESERVA DE RECURSOS
-- El período se denormaliza a propósito: es la única forma de aplicar
-- una restricción de exclusión sobre la relación N:N.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE appointment_resource (
  appointment_id uuid NOT NULL REFERENCES appointment(id) ON DELETE CASCADE,
  resource_id    uuid NOT NULL REFERENCES resource(id) ON DELETE RESTRICT,
  period         tstzrange NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  PRIMARY KEY (appointment_id, resource_id),

  -- ★ INVARIANTE I-03 ★
  CONSTRAINT resource_no_overlap EXCLUDE USING gist (
    resource_id WITH =,
    period      WITH &&
  ) WHERE (active)
);

-- Mantener el período denormalizado sincronizado.
-- Sin esto, reagendar una cita deja el recurso bloqueado en el horario viejo.
CREATE OR REPLACE FUNCTION sync_appointment_resource_period()
RETURNS trigger AS $$
BEGIN
  IF NEW.period IS DISTINCT FROM OLD.period THEN
    UPDATE appointment_resource
       SET period = NEW.period
     WHERE appointment_id = NEW.id AND active;
  END IF;

  IF NEW.status IN ('cancelled','noshow') AND OLD.status NOT IN ('cancelled','noshow') THEN
    UPDATE appointment_resource
       SET active = false
     WHERE appointment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_resource_sync
  AFTER UPDATE ON appointment
  FOR EACH ROW EXECUTE FUNCTION sync_appointment_resource_period();


-- ═══════════════════════════════════════════════════════════════════
-- MÁQUINA DE ESTADOS
-- Las transiciones válidas viven en datos, no en if/else disperso.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE status_transition_rule (
  from_status     text NOT NULL,
  to_status       text NOT NULL,
  allowed_roles   text[] NOT NULL,
  requires_reason boolean NOT NULL DEFAULT false,
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO status_transition_rule (from_status, to_status, allowed_roles, requires_reason) VALUES
  ('requested',  'booked',      '{scheduler,reception,admin}',                        false),
  ('requested',  'cancelled',   '{patient,scheduler,reception,admin}',                true),
  ('booked',     'confirmed',   '{patient,scheduler,reception,admin,system}',         false),
  ('booked',     'arrived',     '{reception,admin}',                                  false),
  ('booked',     'cancelled',   '{patient,scheduler,reception,practitioner,admin}',   true),
  ('booked',     'noshow',      '{reception,practitioner,admin,system}',              false),
  ('confirmed',  'arrived',     '{reception,admin,patient}',                          false),
  ('confirmed',  'cancelled',   '{patient,scheduler,reception,practitioner,admin}',   true),
  ('confirmed',  'noshow',      '{reception,practitioner,admin,system}',              false),
  ('arrived',    'in_progress', '{practitioner,admin}',                               false),
  ('arrived',    'cancelled',   '{reception,practitioner,admin}',                     true),
  ('in_progress','fulfilled',   '{practitioner,admin}',                               false),
  ('in_progress','cancelled',   '{practitioner,admin}',                               true);


CREATE TABLE appointment_transition (
  id             bigserial PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES appointment(id) ON DELETE CASCADE,
  from_status    text,
  to_status      text NOT NULL,
  reason_code    text,
  reason_text    text,
  actor_id       uuid,
  actor_role     text NOT NULL,
  channel        text,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appt_transition_lookup_idx
  ON appointment_transition (appointment_id, occurred_at);

-- Analítica: todas las métricas operacionales se derivan de aquí,
-- nunca de campos mutables de appointment.
CREATE INDEX appt_transition_analytics_idx
  ON appointment_transition (to_status, occurred_at);


-- ★ INVARIANTE I-05 ★ — respaldo a nivel de motor.
-- Si alguien cambia el estado sin registrar la transición, falla.
CREATE OR REPLACE FUNCTION enforce_transition_logged()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM appointment_transition
       WHERE appointment_id = NEW.id
         AND to_status = NEW.status
         AND occurred_at >= now() - interval '5 seconds'
    ) THEN
      RAISE EXCEPTION
        'I-05: cambio de estado % → % sin fila en appointment_transition (cita %)',
        OLD.status, NEW.status, NEW.id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CONSTRAINT TRIGGER DEFERRED: se evalúa al final de la transacción, lo que
-- permite escribir appointment y appointment_transition en cualquier orden.
CREATE CONSTRAINT TRIGGER appointment_transition_required
  AFTER UPDATE ON appointment
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_transition_logged();

-- migrate:down

DROP TABLE IF EXISTS appointment_transition;
DROP TABLE IF EXISTS status_transition_rule;
DROP FUNCTION IF EXISTS enforce_transition_logged();
DROP FUNCTION IF EXISTS sync_appointment_resource_period();
DROP TABLE IF EXISTS appointment_resource;
DROP TABLE IF EXISTS appointment;
