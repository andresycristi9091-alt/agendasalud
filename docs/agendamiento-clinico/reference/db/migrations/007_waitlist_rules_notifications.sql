-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- LISTA DE ESPERA
-- La funcionalidad con mejor retorno de todo el sistema: recupera
-- los cupos que se liberan por cancelación tardía.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE waitlist_entry (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  service_id        uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  location_ids      uuid[] NOT NULL DEFAULT '{}',   -- vacío = cualquier sede
  practitioner_ids  uuid[] NOT NULL DEFAULT '{}',   -- vacío = cualquiera
  modality          text,
  earliest_date     date NOT NULL DEFAULT CURRENT_DATE,
  latest_date       date,
  -- Disponibilidad declarada: [{"dow":[1,2,3],"from":"15:00","to":"19:00"}]
  availability      jsonb NOT NULL DEFAULT '[]',
  clinical_priority smallint NOT NULL DEFAULT 3 CHECK (clinical_priority BETWEEN 1 AND 5),
  current_appointment_id uuid REFERENCES appointment(id),  -- quiere adelantar una hora ya tomada
  offers_declined   integer NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','offered','fulfilled','expired','cancelled')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER waitlist_updated_at BEFORE UPDATE ON waitlist_entry
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Orden de matching: prioridad clínica, luego antigüedad.
CREATE INDEX waitlist_matching_idx ON waitlist_entry
  (service_id, clinical_priority, created_at)
  WHERE status = 'active';


CREATE TABLE waitlist_offer (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     uuid NOT NULL REFERENCES waitlist_entry(id) ON DELETE CASCADE,
  slot_id      uuid NOT NULL REFERENCES slot(id) ON DELETE CASCADE,
  hold_id      uuid REFERENCES slot_hold(id),
  offered_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  responded_at timestamptz,
  outcome      text CHECK (outcome IN ('accepted','declined','expired')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX waitlist_offer_pending_idx ON waitlist_offer (expires_at)
  WHERE outcome IS NULL;

-- Ofertar EN SERIE, no en paralelo: ofrecer el mismo cupo a cinco personas
-- y dárselo al primero que responde destruye la confianza en el sistema.
CREATE UNIQUE INDEX waitlist_offer_one_per_slot_idx ON waitlist_offer (slot_id)
  WHERE outcome IS NULL;


-- ═══════════════════════════════════════════════════════════════════
-- MOTOR DE REGLAS — las reglas viven en datos, versionadas
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE business_rule (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  description    text,
  phase          text NOT NULL
                 CHECK (phase IN ('availability','booking','cancellation',
                                  'reschedule','checkin')),
  priority       integer NOT NULL DEFAULT 100,
  scope          jsonb NOT NULL DEFAULT '{}',   -- {"serviceCodes":[],"channels":[]}
  condition      jsonb NOT NULL,                 -- JsonLogic
  effect         text NOT NULL
                 CHECK (effect IN ('allow','deny','require_approval','warn')),
  messages       jsonb NOT NULL,                 -- {"es":"...","en":"..."}
  remediation    jsonb,
  version        integer NOT NULL DEFAULT 1,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to   timestamptz,
  enabled        boolean NOT NULL DEFAULT false, -- se crea apagada, se simula, se enciende
  created_by     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- ★ INVARIANTE I-08 ★ toda denegación debe poder explicarse
  CONSTRAINT rule_deny_needs_message
    CHECK (effect <> 'deny' OR (messages ? 'es'))
);

CREATE TRIGGER business_rule_updated_at BEFORE UPDATE ON business_rule
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX business_rule_active_idx ON business_rule (phase, priority)
  WHERE enabled;

CREATE TABLE business_rule_history (
  id         bigserial PRIMARY KEY,
  rule_id    text NOT NULL,
  version    integer NOT NULL,
  snapshot   jsonb NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Resultado de simular una regla contra tráfico histórico antes de encenderla.
CREATE TABLE rule_simulation (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       text NOT NULL,
  rule_version  integer NOT NULL,
  window_from   timestamptz NOT NULL,
  window_to     timestamptz NOT NULL,
  evaluated     integer NOT NULL,
  would_deny    integer NOT NULL,
  sample        jsonb NOT NULL DEFAULT '[]',
  run_by        uuid NOT NULL,
  run_at        timestamptz NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════
-- NOTIFICACIONES  ★ INVARIANTE I-12 ★
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE notification_template (
  key        text NOT NULL,
  version    integer NOT NULL,
  channel    text NOT NULL CHECK (channel IN ('sms','email','whatsapp','push')),
  locale     text NOT NULL,
  subject    text,
  body       text NOT NULL,
  variables  text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (key, version, channel, locale)
);

CREATE TABLE notification (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   uuid REFERENCES appointment(id) ON DELETE CASCADE,
  patient_id       uuid NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  template_key     text NOT NULL,
  template_version integer NOT NULL,
  channel          text NOT NULL,
  locale           text NOT NULL,
  recipient        text NOT NULL,
  payload          jsonb NOT NULL DEFAULT '{}',
  scheduled_for    timestamptz NOT NULL,
  sent_at          timestamptz,
  delivered_at     timestamptz,
  status           text NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','sending','sent','delivered',
                                     'failed','cancelled')),
  attempts         integer NOT NULL DEFAULT 0,
  provider         text,
  provider_message_id text,
  failure_reason   text,
  cost_cents       integer,

  -- ★ La columna que evita el desastre de enviar 4 recordatorios
  --   tras un reintento de despliegue.
  dedup_key        text NOT NULL UNIQUE,

  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_due_idx ON notification (scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX notification_appointment_idx ON notification (appointment_id)
  WHERE status = 'scheduled';

-- Presupuesto por sede: un bug en el planificador puede generar decenas de
-- miles de SMS en minutos. El corte es duro, no una alerta.
CREATE TABLE notification_budget (
  location_id   uuid NOT NULL REFERENCES location(id) ON DELETE CASCADE,
  period_month  date NOT NULL,
  limit_cents   integer NOT NULL,
  spent_cents   integer NOT NULL DEFAULT 0,
  hard_stop     boolean NOT NULL DEFAULT true,
  PRIMARY KEY (location_id, period_month)
);

-- migrate:down

DROP TABLE IF EXISTS notification_budget;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS notification_template;
DROP TABLE IF EXISTS rule_simulation;
DROP TABLE IF EXISTS business_rule_history;
DROP TABLE IF EXISTS business_rule;
DROP TABLE IF EXISTS waitlist_offer;
DROP TABLE IF EXISTS waitlist_entry;
