export type Role = 'admin' | 'funcionario' | 'medico'
export type TipoCita = 'urgente' | 'control' | 'orientacion'
export type EstadoCita = 'agendada' | 'confirmada' | 'cancelada' | 'no_show' | 'atendida'
export type CanalCita = 'web' | 'whatsapp' | 'manual'

export interface Centro {
  id: string
  nombre: string
  direccion: string | null
  comuna: string | null
  telefono: string | null
  whatsapp: string | null
  activo: boolean
  created_at: string
}

export interface Profile {
  id: string
  role: Role
  nombre: string
  telefono: string | null
  rut: string | null
  cesfam_id: string | null
  created_at: string
}

export interface Medico {
  id: string
  profile_id: string
  centro_id: string
  especialidad: string
  activo: boolean
  created_at: string
}

export interface Box {
  id: string
  centro_id: string
  nombre: string
  activo: boolean
}

export interface Horario {
  id: string
  medico_id: string
  box_id: string | null
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  duracion_min: number
  activo: boolean
}

export interface Paciente {
  id: string
  rut: string
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
  centro_id: string | null
  created_at: string
}

export interface Cita {
  id: string
  paciente_id: string
  medico_id: string
  box_id: string | null
  fecha_hora: string
  tipo: TipoCita
  estado: EstadoCita
  canal: CanalCita
  triage_motivo: string | null
  triage_resultado: string | null
  notas: string | null
  created_at: string
}

export interface CitaConRelaciones extends Cita {
  paciente: Paciente
  medico: Medico & { profile: Profile }
  box: Box | null
}
