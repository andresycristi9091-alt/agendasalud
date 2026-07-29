-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- OFERTA: plantillas declarativas → slots materializados
-- La plantilla es la definición; el slot es su proyección.
-- Ver docs/adr/0003 para la justificación del enfoque híbrido.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE schedule_template (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES practitioner(id) ON DELETE RESTRICT,
  location_id     uuid NOT NULL REFERENCES location(id) ON DELETE RESTRICT,
  service_ids     uuid[] NOT NULL CHECK (cardinality(service_ids) > 0),
  rrule           text NOT NULL,     -- RFC 5545, p.ej. 'FREQ=WEEKLY;BYDAY=MO,WE'
  local_start     time NOT NULL,     -- hora LOCAL de la sede
  local_end       time NOT NULL,
  slot_duration   interval NOT NULL CHECK (slot_duration > interval '0'),
  capacity        integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  valid_from      date NOT NULL,
  valid_to        date,
  version         integer NOT NULL DEFAULT 1,
  active          boolean NOT NULL DEFAULT true,
  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT template_time_order CHECK (local_end > local_start),
  CONSTRAINT template_date_order CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TRIGGER schedule_template_updated_at BEFORE UPDATE ON schedule_template
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Bloqueos: reuniones, docencia, vacaciones, cierres de sede
CREATE TABLE schedule_block (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES practitioner(id) ON DELETE CASCADE,
  location_id     uuid REFERENCES location(id) ON DELETE CASCADE,
  period          tstzrange NOT NULL,
  reason_code     text NOT NULL,   -- meeting | teaching | leave | holiday | closure
  reason_text     text,
  visible_to_patient boolean NOT NULL DEFAULT false,
  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT block_has_target
    CHECK (practitioner_id IS NOT NULL OR location_id IS NOT NULL)
);

CREATE INDEX schedule_block_period_idx ON schedule_block USING gist (period);


-- ═══════════════════════════════════════════════════════════════════
-- SLOT — la tabla más importante del sistema
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE slot (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid REFERENCES schedule_template(id) ON DELETE SET NULL,
  template_version integer,
  practitioner_id uuid NOT NULL REFERENCES practitioner(id) ON DELETE RESTRICT,
  location_id     uuid NOT NULL REFERENCES location(id) ON DELETE RESTRICT,
  service_ids     uuid[] NOT NULL,
  period          tstzrange NOT NULL,
  status          text NOT NULL DEFAULT 'free'
                  CHECK (status IN ('free','held','booked','blocked','conflicted')),
  overbook        boolean NOT NULL DEFAULT false,
  overbook_authorized_by uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT slot_period_bounded
    CHECK (NOT isempty(period) AND lower(period) IS NOT NULL AND upper(period) IS NOT NULL),

  -- ★ INVARIANTE I-01 ★
  -- Dos slots activos del mismo profesional no pueden solaparse.
  -- Los sobrecupos quedan fuera del predicado a propósito: son la excepción
  -- explícita y autorizada. Los bloqueados también, porque representan
  -- indisponibilidad, no oferta.
  CONSTRAINT slot_no_overlap EXCLUDE USING gist (
    practitioner_id WITH =,
    period          WITH &&
  ) WHERE (status <> 'blocked' AND overbook = false),

  CONSTRAINT overbook_requires_authorization
    CHECK (NOT overbook OR overbook_authorized_by IS NOT NULL)
);

CREATE TRIGGER slot_updated_at BEFORE UPDATE ON slot
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Búsqueda por profesional y rango (agenda del clínico)
CREATE INDEX slot_practitioner_period_idx ON slot
  USING gist (practitioner_id, period);

-- Descubrimiento de disponibilidad (portal del paciente).
-- Índice parcial: solo lo que se puede ofrecer.
CREATE INDEX slot_discovery_idx ON slot (location_id, lower(period))
  INCLUDE (service_ids, practitioner_id)
  WHERE status = 'free';

-- Bandeja de resolución de conflictos
CREATE INDEX slot_conflicted_idx ON slot (location_id, lower(period))
  WHERE status = 'conflicted';

CREATE INDEX slot_template_idx ON slot (template_id, lower(period));


-- ═══════════════════════════════════════════════════════════════════
-- HOLD — reserva temporal durante el llenado del formulario.
-- Es una MEJORA DE EXPERIENCIA, no una garantía de corrección.
-- La corrección la dan el lock pesimista y la exclusion constraint.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE slot_hold (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id     uuid NOT NULL REFERENCES slot(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  held_for    text NOT NULL DEFAULT 'patient',  -- patient | waitlist_offer
  patient_id  uuid REFERENCES patient(id),
  expires_at  timestamptz NOT NULL,
  released_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT hold_expiry_future CHECK (expires_at > created_at)
);

-- Un solo hold activo por slot.
-- (No se puede incluir `expires_at > now()` en el predicado porque now() no es
--  IMMUTABLE. El vencimiento se maneja con el job de limpieza + filtro en query.)
CREATE UNIQUE INDEX slot_hold_active_idx ON slot_hold (slot_id)
  WHERE released_at IS NULL;

CREATE INDEX slot_hold_expiry_idx ON slot_hold (expires_at)
  WHERE released_at IS NULL;

-- migrate:down

DROP TABLE IF EXISTS slot_hold;
DROP TABLE IF EXISTS slot;
DROP TABLE IF EXISTS schedule_block;
DROP TABLE IF EXISTS schedule_template;
