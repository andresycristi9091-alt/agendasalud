-- migrate:up

CREATE TABLE location (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  timezone     text NOT NULL,          -- IANA: 'America/Santiago'. Nunca un offset.
  address      jsonb NOT NULL,
  geo_lat      double precision,
  geo_lng      double precision,
  opening_hours jsonb NOT NULL DEFAULT '{}',
  accessibility jsonb NOT NULL DEFAULT '{}',  -- {"stepFree":true,"parking":true}
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Falla temprano si alguien escribe 'GMT-4' o 'UTC-3'
  CONSTRAINT location_timezone_is_iana
    CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_+-0-9]+$')
);

CREATE TRIGGER location_updated_at BEFORE UPDATE ON location
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE resource (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES location(id) ON DELETE RESTRICT,
  kind        text NOT NULL CHECK (kind IN ('room','chair','device','vehicle')),
  code        text NOT NULL,
  name        text NOT NULL,
  attributes  jsonb NOT NULL DEFAULT '{}',   -- {"floor":1,"wheelchairAccessible":true}
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TRIGGER resource_updated_at BEFORE UPDATE ON resource
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE service (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  clinical_name     text NOT NULL,   -- "Consulta ambulatoria dermatología"
  patient_name      text NOT NULL,   -- "Consulta con dermatólogo"
  specialty         text NOT NULL,
  default_duration  interval NOT NULL CHECK (default_duration > interval '0'),
  buffer_before     interval NOT NULL DEFAULT interval '0',
  buffer_after      interval NOT NULL DEFAULT interval '0',
  required_resource_kinds text[] NOT NULL DEFAULT '{}',
  requires_referral boolean NOT NULL DEFAULT false,
  allows_telehealth boolean NOT NULL DEFAULT false,
  preparation_notes jsonb NOT NULL DEFAULT '{}',  -- {"es":"Venir en ayunas de 8h"}
  search_terms      text[] NOT NULL DEFAULT '{}', -- sinónimos coloquiales
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER service_updated_at BEFORE UPDATE ON service
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Búsqueda tolerante: "dolor de muela" debe encontrar Odontología
CREATE INDEX service_search_idx ON service
  USING gin ((patient_name || ' ' || specialty || ' ' ||
              array_to_string(search_terms, ' ')) gin_trgm_ops)
  WHERE active;

-- migrate:down

DROP TABLE IF EXISTS service;
DROP TABLE IF EXISTS resource;
DROP TABLE IF EXISTS location;
