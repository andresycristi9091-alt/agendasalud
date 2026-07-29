-- =====================================================================
-- Etapa 1: nucleo transaccional de citas en Supabase Postgres
-- Adaptado del blueprint docs/agendamiento-clinico (invariantes I-01,
-- I-02, I-04, I-05). Ejecutar en el SQL Editor de Supabase.
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ── Tabla principal de citas ─────────────────────────────────────────
create table if not exists appointment (
  id uuid primary key,
  professional_id text not null,
  professional_slug text not null default '',
  patient_name text not null,
  patient_email text not null,
  patient_phone text not null default '',
  patient_rut text not null default '',
  reason text not null default '',
  -- Campos locales (hora chilena) para compatibilidad con el MVP actual
  local_date text not null check (local_date ~ '^\d{4}-\d{2}-\d{2}$'),
  start_time text not null check (start_time ~ '^\d{2}:\d{2}$'),
  end_time text not null check (end_time ~ '^\d{2}:\d{2}$'),
  -- Instantes canonicos en UTC (invariante I-06)
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'America/Santiago',
  status text not null default 'confirmada'
    check (status in ('confirmada','cancelada','completada','no_asiste','reagendada')),
  google_calendar_event_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

-- Invariante I-01: dos citas activas nunca se solapan para el mismo profesional.
alter table appointment add constraint appointment_no_professional_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(start_at, end_at) with &&
  ) where (status in ('confirmada','reagendada'));

-- Invariante I-02: un paciente nunca tiene dos citas activas solapadas.
alter table appointment add constraint appointment_no_patient_overlap
  exclude using gist (
    (lower(patient_email)) with =,
    tstzrange(start_at, end_at) with &&
  ) where (status in ('confirmada','reagendada'));

create index if not exists appointment_professional_date_idx
  on appointment (professional_id, local_date);
create index if not exists appointment_local_date_idx
  on appointment (local_date);
create index if not exists appointment_patient_email_idx
  on appointment ((lower(patient_email)));

-- ── Transiciones de estado (invariante I-05) ─────────────────────────
create table if not exists appointment_transition (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointment(id),
  from_status text,
  to_status text not null,
  actor text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists appointment_transition_appointment_idx
  on appointment_transition (appointment_id, created_at);

-- ── Idempotencia de escrituras (invariante I-04) ─────────────────────
create table if not exists idempotency_record (
  key text primary key,
  request_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

-- ── Funcion transaccional de reserva ─────────────────────────────────
-- Inserta cita + transicion inicial + registro de idempotencia en UNA
-- transaccion. La doble reserva la rechaza la restriccion de exclusion,
-- no el codigo de aplicacion.
create or replace function book_appointment(
  p jsonb,
  p_idempotency_key text default null,
  p_request_hash text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing idempotency_record%rowtype;
  v_id uuid;
  v_response jsonb;
begin
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select * into v_existing from idempotency_record where key = p_idempotency_key;
    if found then
      if v_existing.request_hash = coalesce(p_request_hash, '') then
        return v_existing.response || jsonb_build_object('status', 'duplicate');
      end if;
      return jsonb_build_object('status', 'idempotency_conflict');
    end if;
  end if;

  v_id := coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid());

  begin
    insert into appointment (
      id, professional_id, professional_slug, patient_name, patient_email,
      patient_phone, patient_rut, reason, local_date, start_time, end_time,
      start_at, end_at, timezone, status, google_calendar_event_id
    ) values (
      v_id,
      p->>'professionalId',
      coalesce(p->>'professionalSlug', ''),
      p->>'patientName',
      p->>'patientEmail',
      coalesce(p->>'patientPhone', ''),
      coalesce(p->>'patientRut', ''),
      coalesce(p->>'reason', ''),
      p->>'date',
      p->>'startTime',
      p->>'endTime',
      (p->>'startAt')::timestamptz,
      (p->>'endAt')::timestamptz,
      coalesce(p->>'timezone', 'America/Santiago'),
      'confirmada',
      coalesce(p->>'googleCalendarEventId', '')
    );
  exception when exclusion_violation then
    return jsonb_build_object('status', 'slot_taken');
  end;

  insert into appointment_transition (appointment_id, from_status, to_status, actor)
  values (v_id, null, 'confirmada', coalesce(p->>'actor', 'public'));

  v_response := jsonb_build_object('appointmentId', v_id);

  if p_idempotency_key is not null and p_idempotency_key <> '' then
    insert into idempotency_record (key, request_hash, response)
    values (p_idempotency_key, coalesce(p_request_hash, ''), v_response);
  end if;

  return v_response || jsonb_build_object('status', 'created');
end;
$$;

-- ── Funcion transaccional de transicion de estado ────────────────────
create or replace function transition_appointment(
  p_id uuid,
  p_to_status text,
  p_actor text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text;
begin
  select status into v_from from appointment where id = p_id for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_from = p_to_status then
    return jsonb_build_object('status', 'noop', 'fromStatus', v_from);
  end if;

  begin
    update appointment set status = p_to_status, updated_at = now() where id = p_id;
  exception when exclusion_violation then
    -- Reactivar una cita sobre un horario ya tomado viola la exclusion.
    return jsonb_build_object('status', 'slot_taken');
  end;

  insert into appointment_transition (appointment_id, from_status, to_status, actor)
  values (p_id, v_from, p_to_status, coalesce(p_actor, ''));

  return jsonb_build_object('status', 'ok', 'fromStatus', v_from);
end;
$$;

-- ── Funcion de importacion (backfill desde Google Sheets) ────────────
create or replace function import_appointment(p jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := (p->>'id')::uuid;

  if exists (select 1 from appointment where id = v_id) then
    return jsonb_build_object('status', 'exists');
  end if;

  begin
    insert into appointment (
      id, professional_id, professional_slug, patient_name, patient_email,
      patient_phone, patient_rut, reason, local_date, start_time, end_time,
      start_at, end_at, timezone, status, google_calendar_event_id, created_at
    ) values (
      v_id,
      p->>'professionalId',
      coalesce(p->>'professionalSlug', ''),
      p->>'patientName',
      p->>'patientEmail',
      coalesce(p->>'patientPhone', ''),
      coalesce(p->>'patientRut', ''),
      coalesce(p->>'reason', ''),
      p->>'date',
      p->>'startTime',
      p->>'endTime',
      (p->>'startAt')::timestamptz,
      (p->>'endAt')::timestamptz,
      coalesce(p->>'timezone', 'America/Santiago'),
      coalesce(p->>'status', 'confirmada'),
      coalesce(p->>'googleCalendarEventId', '')
      , coalesce(nullif(p->>'createdAt','')::timestamptz, now())
    );
  exception when exclusion_violation then
    return jsonb_build_object('status', 'slot_conflict');
  end;

  insert into appointment_transition (appointment_id, from_status, to_status, actor)
  values (v_id, null, coalesce(p->>'status', 'confirmada'), 'backfill');

  return jsonb_build_object('status', 'imported');
end;
$$;

-- ── Seguridad: solo la service role accede ───────────────────────────
alter table appointment enable row level security;
alter table appointment_transition enable row level security;
alter table idempotency_record enable row level security;

revoke all on appointment, appointment_transition, idempotency_record from anon, authenticated;
revoke execute on function book_appointment(jsonb, text, text) from public, anon, authenticated;
revoke execute on function transition_appointment(uuid, text, text) from public, anon, authenticated;
revoke execute on function import_appointment(jsonb) from public, anon, authenticated;
grant execute on function book_appointment(jsonb, text, text) to service_role;
grant execute on function transition_appointment(uuid, text, text) to service_role;
grant execute on function import_appointment(jsonb) to service_role;
