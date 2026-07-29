-- migrate:up

CREATE TABLE patient (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type     text NOT NULL,     -- 'RUT' | 'DNI' | 'PASSPORT' | 'TEMP'
  identifier_value    text NOT NULL,
  given_name          text NOT NULL,
  family_name         text NOT NULL,
  preferred_name      text,
  birth_date          date NOT NULL,
  phone_e164          text CHECK (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  email               text,
  preferred_language  text NOT NULL DEFAULT 'es',
  preferred_channel   text NOT NULL DEFAULT 'sms'
                      CHECK (preferred_channel IN ('sms','email','whatsapp','push','none')),
  accessibility_needs jsonb NOT NULL DEFAULT '{}',
      -- {"signLanguage":true,"wheelchair":true,"companion":true,"groundFloor":true}
      -- Se propaga a la vista del clínico y de admisión.
  insurance           jsonb NOT NULL DEFAULT '{}',
  merged_into_id      uuid REFERENCES patient(id),  -- deduplicación: no se borra, se fusiona
  deceased_at         date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (identifier_type, identifier_value)
);

CREATE TRIGGER patient_updated_at BEFORE UPDATE ON patient
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX patient_active_idx ON patient (id) WHERE merged_into_id IS NULL;
CREATE INDEX patient_name_trgm_idx ON patient
  USING gin ((given_name || ' ' || family_name) gin_trgm_ops);


-- Relaciones de cuidado: quién puede agendar por quién.
-- Requisito, no extra: gran parte de las horas las agenda un familiar.
CREATE TABLE patient_relationship (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id   uuid NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  dependent_id   uuid NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  relationship   text NOT NULL,   -- 'parent' | 'guardian' | 'spouse' | 'caregiver'
  can_book       boolean NOT NULL DEFAULT true,
  can_view_clinical boolean NOT NULL DEFAULT false,
  verified_at    timestamptz,
  verified_by    uuid,
  valid_until    date,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT no_self_relationship CHECK (caregiver_id <> dependent_id),
  UNIQUE (caregiver_id, dependent_id)
);


CREATE TABLE app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_sub  text NOT NULL UNIQUE,   -- 'sub' del proveedor OIDC
  email         text NOT NULL,
  display_name  text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER app_user_updated_at BEFORE UPDATE ON app_user
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE user_role_assignment (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role         text NOT NULL,   -- reception | scheduler | practitioner |
                                -- service_lead | admin | auditor
  location_id  uuid REFERENCES location(id),   -- NULL = todas las sedes
  specialty    text,                            -- NULL = todas
  valid_from   date NOT NULL DEFAULT CURRENT_DATE,
  valid_to     date,
  granted_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_role_lookup_idx ON user_role_assignment (user_id)
  WHERE valid_to IS NULL OR valid_to >= CURRENT_DATE;


CREATE TABLE practitioner (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL UNIQUE REFERENCES app_user(id),
  registry_number    text,
  registry_valid_to  date,
  specialties        text[] NOT NULL DEFAULT '{}',
  languages          text[] NOT NULL DEFAULT '{es}',
  gender             text,       -- relevante como filtro de paciente en varias especialidades
  bio                jsonb NOT NULL DEFAULT '{}',
  photo_url          text,
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER practitioner_updated_at BEFORE UPDATE ON practitioner
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Delegación: secretaria clínica que gestiona la agenda de uno o varios profesionales
CREATE TABLE schedule_delegation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES practitioner(id) ON DELETE CASCADE,
  delegate_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  granted_by      uuid NOT NULL,
  valid_from      date NOT NULL DEFAULT CURRENT_DATE,
  valid_to        date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, delegate_user_id)
);


-- Consentimientos versionados: qué aceptó, en qué versión, cuándo
CREATE TABLE consent (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  consent_type  text NOT NULL,   -- data_processing | telehealth | cancellation_policy
  version       text NOT NULL,
  granted       boolean NOT NULL,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  granted_by    uuid NOT NULL,   -- puede ser el cuidador
  channel       text NOT NULL,
  ip_address    inet,
  document_hash text NOT NULL    -- hash del texto exacto aceptado
);

CREATE INDEX consent_lookup_idx ON consent (patient_id, consent_type, granted_at DESC);

-- migrate:down

DROP TABLE IF EXISTS consent;
DROP TABLE IF EXISTS schedule_delegation;
DROP TABLE IF EXISTS practitioner;
DROP TABLE IF EXISTS user_role_assignment;
DROP TABLE IF EXISTS app_user;
DROP TABLE IF EXISTS patient_relationship;
DROP TABLE IF EXISTS patient;
