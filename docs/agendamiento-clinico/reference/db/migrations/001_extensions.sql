-- migrate:up

CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid, digest
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- ← indispensable: permite mezclar
                                            --   igualdad (uuid) y solapamiento
                                            --   (tstzrange) en un mismo índice GiST
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- búsqueda tolerante a errores

-- Nota sobre IDs: la aplicación genera UUIDv7 (ordenables por tiempo, no
-- enumerables). El DEFAULT gen_random_uuid() existe solo como red de seguridad
-- para inserciones manuales; el código de producción siempre envía el id.

-- Actualización automática de updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rol de aplicación con privilegios acotados (la app NUNCA usa el superusuario)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END $$;

-- migrate:down

DROP FUNCTION IF EXISTS set_updated_at();
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS btree_gist;
DROP EXTENSION IF EXISTS pgcrypto;
