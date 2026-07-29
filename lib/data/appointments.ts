import * as sheets from '@/lib/google/sheets'
import type { Appointment, AppointmentStatus } from '@/lib/google/sheets'

// Facade de datos de citas (Etapa 1 de la reconciliacion con el blueprint).
//
// - Backend por defecto: Google Sheets (comportamiento historico del MVP).
// - Con BOOKING_BACKEND=postgres + SUPABASE_SERVICE_ROLE_KEY, la fuente de
//   verdad pasa a Supabase Postgres (restricciones de exclusion, transiciones
//   e idempotencia en la base). Google Sheets queda como espejo de lectura
//   para el cliente: las escrituras se replican best effort y nunca bloquean.
//
// El modulo Postgres se importa de forma diferida para no cargar el cliente
// admin de Supabase cuando el backend es Sheets (tests y build incluidos).

export function isPostgresBookingEnabled(): boolean {
  return (
    process.env.BOOKING_BACKEND === 'postgres' &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  )
}

async function pg() {
  return import('@/lib/db/booking')
}

function mirrorToSheets(operation: string, task: Promise<unknown>) {
  task.catch((error) => {
    console.warn(`[appointments] Espejo en Sheets fallo (${operation}):`, error)
  })
}

export type CreateAppointmentOptions = {
  idempotencyKey?: string
  requestHash?: string
  actor?: string
}

export type CreateAppointmentResult = {
  appointmentId: string
  duplicate: boolean
}

export async function createAppointmentRecord(
  data: Omit<Appointment, 'createdAt' | 'updatedAt'>,
  options?: CreateAppointmentOptions
): Promise<CreateAppointmentResult> {
  if (isPostgresBookingEnabled()) {
    const db = await pg()
    const result = await db.bookAppointmentInPostgres(data, options)

    if (!result.duplicate) {
      mirrorToSheets('create', sheets.createAppointment({ ...data, id: result.appointmentId }))
    }

    return result
  }

  await sheets.createAppointment(data)
  return { appointmentId: data.id, duplicate: false }
}

export async function findIdempotentBooking(
  key: string,
  requestHash: string
): Promise<string | null> {
  if (!isPostgresBookingEnabled()) return null
  const db = await pg()
  return db.findIdempotentBooking(key, requestHash).catch(() => null)
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  actor = ''
): Promise<void> {
  if (isPostgresBookingEnabled()) {
    const db = await pg()
    await db.transitionAppointmentInPostgres(id, status, actor)
    mirrorToSheets('status', sheets.updateAppointmentStatus(id, status))
    return
  }

  await sheets.updateAppointmentStatus(id, status)
}

export async function isSlotTaken(
  professionalId: string,
  date: string,
  startTime: string
): Promise<boolean> {
  if (isPostgresBookingEnabled()) {
    const db = await pg()
    return db.isSlotTakenPg(professionalId, date, startTime)
  }
  return sheets.isSlotTaken(professionalId, date, startTime)
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  if (isPostgresBookingEnabled()) {
    const db = await pg()
    return db.getAppointmentByIdPg(id)
  }
  return sheets.getAppointmentById(id)
}

export async function getAppointmentsByProfessional(professionalId: string): Promise<Appointment[]> {
  if (isPostgresBookingEnabled()) {
    const db = await pg()
    return db.getAppointmentsByProfessionalPg(professionalId)
  }
  return sheets.getAppointmentsByProfessional(professionalId)
}

export async function getAppointmentsByDateAndProfessional(
  professionalId: string,
  date: string
): Promise<Appointment[]> {
  if (isPostgresBookingEnabled()) {
    const db = await pg()
    return db.getAppointmentsByDateAndProfessionalPg(professionalId, date)
  }
  return sheets.getAppointmentsByDateAndProfessional(professionalId, date)
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  if (isPostgresBookingEnabled()) {
    const db = await pg()
    return db.getAppointmentsByDatePg(date)
  }
  return sheets.getAppointmentsByDate(date)
}

export async function getAppointmentsByPatientEmail(email: string): Promise<Appointment[]> {
  if (isPostgresBookingEnabled()) {
    const db = await pg()
    return db.getAppointmentsByPatientEmailPg(email)
  }
  return sheets.getAppointmentsByPatientEmail(email)
}
