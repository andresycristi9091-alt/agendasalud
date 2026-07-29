import { createAdminSupabaseClient } from '@/lib/auth/admin'
import { chileLocalDateTimeToISO } from '@/lib/date'
import type { Appointment, AppointmentStatus } from '@/lib/google/sheets'

// Repositorio de citas sobre Supabase Postgres. Las garantias fuertes
// (no solapamiento, idempotencia, transiciones) viven en la base de datos:
// ver supabase/migrations/0001_booking_core.sql.

export class SlotTakenError extends Error {
  constructor() {
    super('Ese horario acaba de ser tomado. Por favor elige otro horario.')
    this.name = 'SlotTakenError'
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super('Ya procesamos una solicitud distinta con la misma clave. Intenta nuevamente.')
    this.name = 'IdempotencyConflictError'
  }
}

type AppointmentRow = {
  id: string
  professional_id: string
  professional_slug: string
  patient_name: string
  patient_email: string
  patient_phone: string
  patient_rut: string
  reason: string
  local_date: string
  start_time: string
  end_time: string
  timezone: string
  status: AppointmentStatus
  google_calendar_event_id: string
  created_at: string
  updated_at: string
}

const APPOINTMENT_COLUMNS =
  'id, professional_id, professional_slug, patient_name, patient_email, patient_phone, patient_rut, reason, local_date, start_time, end_time, timezone, status, google_calendar_event_id, created_at, updated_at'

function rowToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    professionalId: row.professional_id,
    professionalSlug: row.professional_slug,
    patientName: row.patient_name,
    patientEmail: row.patient_email,
    patientPhone: row.patient_phone,
    patientRut: row.patient_rut,
    reason: row.reason,
    date: row.local_date,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
    status: row.status,
    googleCalendarEventId: row.google_calendar_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getClient() {
  return createAdminSupabaseClient()
}

export type BookInPostgresResult = {
  appointmentId: string
  duplicate: boolean
}

export async function bookAppointmentInPostgres(
  data: Omit<Appointment, 'createdAt' | 'updatedAt'>,
  options?: { idempotencyKey?: string; requestHash?: string; actor?: string }
): Promise<BookInPostgresResult> {
  const supabase = getClient()
  const { data: result, error } = await supabase.rpc('book_appointment', {
    p: {
      id: data.id,
      professionalId: data.professionalId,
      professionalSlug: data.professionalSlug,
      patientName: data.patientName,
      patientEmail: data.patientEmail,
      patientPhone: data.patientPhone,
      patientRut: data.patientRut,
      reason: data.reason,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      startAt: chileLocalDateTimeToISO(data.date, data.startTime),
      endAt: chileLocalDateTimeToISO(data.date, data.endTime),
      timezone: data.timezone,
      googleCalendarEventId: data.googleCalendarEventId,
      actor: options?.actor ?? 'public',
    },
    p_idempotency_key: options?.idempotencyKey ?? null,
    p_request_hash: options?.requestHash ?? null,
  })

  if (error) throw new Error(`[booking-pg] ${error.message}`)

  const status = String((result as { status?: string })?.status ?? '')
  const appointmentId = String((result as { appointmentId?: string })?.appointmentId ?? '')

  if (status === 'slot_taken') throw new SlotTakenError()
  if (status === 'idempotency_conflict') throw new IdempotencyConflictError()
  if (status === 'duplicate') return { appointmentId, duplicate: true }
  if (status === 'created') return { appointmentId, duplicate: false }

  throw new Error(`[booking-pg] Respuesta inesperada de book_appointment: ${status}`)
}

export async function transitionAppointmentInPostgres(
  id: string,
  toStatus: AppointmentStatus,
  actor: string
): Promise<void> {
  const supabase = getClient()
  const { data: result, error } = await supabase.rpc('transition_appointment', {
    p_id: id,
    p_to_status: toStatus,
    p_actor: actor,
  })

  if (error) throw new Error(`[booking-pg] ${error.message}`)

  const status = String((result as { status?: string })?.status ?? '')
  if (status === 'not_found') throw new Error('Cita no encontrada')
  if (status === 'slot_taken') throw new SlotTakenError()
}

export async function importAppointmentToPostgres(
  appointment: Appointment
): Promise<'imported' | 'exists' | 'slot_conflict'> {
  const supabase = getClient()
  const { data: result, error } = await supabase.rpc('import_appointment', {
    p: {
      id: appointment.id,
      professionalId: appointment.professionalId,
      professionalSlug: appointment.professionalSlug,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      patientPhone: appointment.patientPhone,
      patientRut: appointment.patientRut,
      reason: appointment.reason,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      startAt: chileLocalDateTimeToISO(appointment.date, appointment.startTime),
      endAt: chileLocalDateTimeToISO(appointment.date, appointment.endTime),
      timezone: appointment.timezone,
      status: appointment.status,
      googleCalendarEventId: appointment.googleCalendarEventId,
      createdAt: appointment.createdAt,
    },
  })

  if (error) throw new Error(`[booking-pg] ${error.message}`)

  const status = String((result as { status?: string })?.status ?? '')
  if (status === 'imported' || status === 'exists' || status === 'slot_conflict') return status
  throw new Error(`[booking-pg] Respuesta inesperada de import_appointment: ${status}`)
}

export async function findIdempotentBooking(
  key: string,
  requestHash: string
): Promise<string | null> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('idempotency_record')
    .select('request_hash, response')
    .eq('key', key)
    .maybeSingle()

  if (error || !data) return null
  if (data.request_hash !== requestHash) return null
  return String((data.response as { appointmentId?: string })?.appointmentId ?? '') || null
}

export async function getAppointmentByIdPg(id: string): Promise<Appointment | null> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`[booking-pg] ${error.message}`)
  return data ? rowToAppointment(data as AppointmentRow) : null
}

export async function getAppointmentsByProfessionalPg(professionalId: string): Promise<Appointment[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_COLUMNS)
    .eq('professional_id', professionalId)
    .order('local_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw new Error(`[booking-pg] ${error.message}`)
  return ((data ?? []) as AppointmentRow[]).map(rowToAppointment)
}

export async function getAppointmentsByDateAndProfessionalPg(
  professionalId: string,
  date: string
): Promise<Appointment[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_COLUMNS)
    .eq('professional_id', professionalId)
    .eq('local_date', date)
    .neq('status', 'cancelada')
    .order('start_time', { ascending: true })

  if (error) throw new Error(`[booking-pg] ${error.message}`)
  return ((data ?? []) as AppointmentRow[]).map(rowToAppointment)
}

export async function getAppointmentsByDatePg(date: string): Promise<Appointment[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_COLUMNS)
    .eq('local_date', date)
    .neq('status', 'cancelada')
    .order('start_time', { ascending: true })

  if (error) throw new Error(`[booking-pg] ${error.message}`)
  return ((data ?? []) as AppointmentRow[]).map(rowToAppointment)
}

export async function getAppointmentsByPatientEmailPg(email: string): Promise<Appointment[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_COLUMNS)
    .ilike('patient_email', email.trim())
    .order('local_date', { ascending: false })
    .order('start_time', { ascending: false })

  if (error) throw new Error(`[booking-pg] ${error.message}`)
  return ((data ?? []) as AppointmentRow[]).map(rowToAppointment)
}

export async function isSlotTakenPg(
  professionalId: string,
  date: string,
  startTime: string
): Promise<boolean> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('appointment')
    .select('id')
    .eq('professional_id', professionalId)
    .eq('local_date', date)
    .eq('start_time', startTime)
    .in('status', ['confirmada', 'reagendada'])
    .limit(1)

  if (error) throw new Error(`[booking-pg] ${error.message}`)
  return (data ?? []).length > 0
}
