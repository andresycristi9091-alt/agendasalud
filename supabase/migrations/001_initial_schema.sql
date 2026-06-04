-- AgendaSalud APS — Schema inicial
-- Ejecutar en Supabase SQL Editor

-- Perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'funcionario', 'medico')),
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  rut         TEXT UNIQUE,
  cesfam_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Centros de salud (CESFAM)
CREATE TABLE centros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  direccion   TEXT,
  comuna      TEXT,
  telefono    TEXT,
  whatsapp    TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- FK diferida para evitar dependencia circular
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_centros
  FOREIGN KEY (cesfam_id) REFERENCES centros(id);

-- Médicos
CREATE TABLE medicos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  centro_id     UUID REFERENCES centros(id),
  especialidad  TEXT NOT NULL DEFAULT 'Medicina General',
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Boxes / consultorios
CREATE TABLE boxes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id   UUID REFERENCES centros(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  activo      BOOLEAN DEFAULT TRUE
);

-- Horarios de disponibilidad
CREATE TABLE horarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id       UUID REFERENCES medicos(id) ON DELETE CASCADE,
  box_id          UUID REFERENCES boxes(id),
  dia_semana      INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  duracion_min    INT NOT NULL DEFAULT 20,
  activo          BOOLEAN DEFAULT TRUE
);

-- Pacientes (no necesitan cuenta en la plataforma)
CREATE TABLE pacientes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut              TEXT UNIQUE NOT NULL,
  nombre           TEXT NOT NULL,
  apellido         TEXT NOT NULL,
  telefono         TEXT,
  email            TEXT,
  fecha_nacimiento DATE,
  centro_id        UUID REFERENCES centros(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Citas
CREATE TABLE citas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id      UUID REFERENCES pacientes(id),
  medico_id        UUID REFERENCES medicos(id),
  box_id           UUID REFERENCES boxes(id),
  fecha_hora       TIMESTAMPTZ NOT NULL,
  tipo             TEXT NOT NULL CHECK (tipo IN ('urgente', 'control', 'orientacion')),
  estado           TEXT NOT NULL DEFAULT 'agendada'
                   CHECK (estado IN ('agendada','confirmada','cancelada','no_show','atendida')),
  canal            TEXT NOT NULL DEFAULT 'web'
                   CHECK (canal IN ('web','whatsapp','manual')),
  triage_motivo    TEXT,
  triage_resultado TEXT,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX idx_citas_fecha_hora    ON citas(fecha_hora);
CREATE INDEX idx_citas_medico_fecha  ON citas(medico_id, fecha_hora);
CREATE INDEX idx_citas_estado        ON citas(estado);
CREATE INDEX idx_citas_paciente      ON citas(paciente_id);

-- Row Level Security
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros   ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE boxes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas     ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "usuarios ven su propio perfil"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuarios ven centros"
  ON centros FOR SELECT TO authenticated USING (true);

CREATE POLICY "usuarios ven medicos"
  ON medicos FOR SELECT TO authenticated USING (true);

CREATE POLICY "usuarios gestionan citas"
  ON citas FOR ALL TO authenticated USING (true);

CREATE POLICY "usuarios gestionan pacientes"
  ON pacientes FOR ALL TO authenticated USING (true);

CREATE POLICY "usuarios ven boxes"
  ON boxes FOR SELECT TO authenticated USING (true);

CREATE POLICY "usuarios ven horarios"
  ON horarios FOR SELECT TO authenticated USING (true);
