-- migrate:up

-- ═══════════════════════════════════════════════════════════════════
-- OUTBOX TRANSACCIONAL
-- Nunca publicar al bus dentro de la transacción de negocio.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE outbox (
  id             bigserial PRIMARY KEY,
  event_id       uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id   uuid NOT NULL,
  event_type     text NOT NULL,
  payload        jsonb NOT NULL,
  trace_id       text,               -- propagación de contexto OTel
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz,
  attempts       integer NOT NULL DEFAULT 0,
  last_error     text
);

-- El publicador lee con FOR UPDATE SKIP LOCKED sobre este índice parcial.
CREATE INDEX outbox_pending_idx ON outbox (id) WHERE published_at IS NULL;
CREATE INDEX outbox_aggregate_idx ON outbox (aggregate_type, aggregate_id, id);


CREATE TABLE processed_event (
  consumer   text NOT NULL,
  event_id   uuid NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, event_id)
);
-- El bus garantiza at-least-once. Esta tabla convierte a los consumidores
-- en idempotentes: una segunda entrega de AppointmentBooked no manda dos SMS.


-- ═══════════════════════════════════════════════════════════════════
-- IDEMPOTENCIA  ★ INVARIANTE I-04 ★
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE idempotency_record (
  key             text PRIMARY KEY,
  request_hash    text NOT NULL,       -- sha256 del cuerpo canonicalizado
  endpoint        text NOT NULL,
  state           text NOT NULL DEFAULT 'in_progress'
                  CHECK (state IN ('in_progress','completed','failed')),
  response_status integer,
  response_body   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);

CREATE INDEX idempotency_expiry_idx ON idempotency_record (expires_at);

-- Protocolo:
--   1. INSERT ... ON CONFLICT DO NOTHING con state='in_progress'
--   2. Si insertó   → ejecutar la operación, luego UPDATE a 'completed'
--   3. Si no insertó→ leer la fila:
--        request_hash distinto → 422 (misma clave, cuerpo distinto)
--        state='in_progress'   → 409 con Retry-After (petición en curso)
--        state='completed'     → devolver response_status/response_body


-- ═══════════════════════════════════════════════════════════════════
-- AUDITORÍA INMUTABLE  ★ INVARIANTES I-09, I-10 ★
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id            bigserial PRIMARY KEY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  actor_id      uuid,
  actor_role    text,
  actor_ip      inet,
  user_agent    text,
  action        text NOT NULL
                CHECK (action IN ('read','create','update','delete','export',
                                  'login','break_glass','config_change')),
  resource_type text NOT NULL,
  resource_id   uuid,
  patient_id    uuid,          -- permite responder "quién vio mi ficha"
  justification text,          -- obligatorio en break_glass
  payload_diff  jsonb,
  trace_id      text,
  prev_hash     bytea,
  row_hash      bytea NOT NULL
);

CREATE INDEX audit_patient_idx ON audit_log (patient_id, occurred_at DESC)
  WHERE patient_id IS NOT NULL;
CREATE INDEX audit_actor_idx ON audit_log (actor_id, occurred_at DESC);
CREATE INDEX audit_breakglass_idx ON audit_log (occurred_at DESC)
  WHERE action = 'break_glass';

-- Cadena de hashes: alterar cualquier fila pasada rompe la verificación.
CREATE OR REPLACE FUNCTION audit_chain_hash()
RETURNS trigger AS $$
DECLARE
  last_hash bytea;
  canonical text;
BEGIN
  SELECT row_hash INTO last_hash
    FROM audit_log ORDER BY id DESC LIMIT 1;

  NEW.prev_hash := last_hash;

  canonical := concat_ws('|',
      NEW.occurred_at::text, coalesce(NEW.actor_id::text,''),
      coalesce(NEW.actor_role,''), NEW.action, NEW.resource_type,
      coalesce(NEW.resource_id::text,''), coalesce(NEW.patient_id::text,''),
      coalesce(NEW.payload_diff::text,''));

  NEW.row_hash := digest(coalesce(last_hash, '\x00'::bytea) ||
                         canonical::bytea, 'sha256');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_hash BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_chain_hash();

-- Append-only de verdad: ni la aplicación puede modificar el histórico.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;
GRANT INSERT, SELECT ON audit_log TO app_user;
GRANT USAGE, SELECT ON SEQUENCE audit_log_id_seq TO app_user;

-- migrate:down

DROP TABLE IF EXISTS audit_log;
DROP FUNCTION IF EXISTS audit_chain_hash();
DROP TABLE IF EXISTS idempotency_record;
DROP TABLE IF EXISTS processed_event;
DROP TABLE IF EXISTS outbox;
