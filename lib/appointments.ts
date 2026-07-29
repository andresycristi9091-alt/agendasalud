import { v4 as uuidv4 } from 'uuid'
import { cancelCalendarEvent, createCalendarEvent } from './google/calendar'
import {
  getAvailabilityExceptions,
  getProfessionalBySlug,
  getManagedUsers,
  upsertPatientFromAppointment,
} from './google/sheets'
import {
  createAppointmentRecord,
  findIdempotentBooking,
  isSlotTaken,
} from './data/appointments'
import { bookingRequestHash, resolveIdempotencyKey } from './data/booking-idempotency'
import { SlotTakenError } from './db/booking'
import { TIMEZONE, chileLocalDateTimeToISO, isSlotBusy } from './date'
import { evaluateBookingRules, getBookingRules } from './booking-rules'
import {
  exceptionsToBusyIntervals,
  filterExceptionsForDate,
  isFullDayException,
} from './availability-exceptions'
import { acquireLock, releaseLock, bookingLockKey } from './mutex'
import { sendProfessionalNotification } from './email'
import type { AppointmentInput } from './validation'
import type { Professional } from './google/sheets'

export type BookingResult =
  | { success: true;  appointmentId: string; calendarEventId: string }
  | { success: false; error: string }

export async function bookAppointment(
  input: AppointmentInput,
  options?: { idempotencyKey?: string | null }
): Promise<BookingResult> {
  // 1. Obtener profesional
  const professional = await getProfessionalBySlug(input.professionalSlug)
  if (!professional) {
    return { success: false, error: 'Profesional no encontrado.' }
  }

  // Idempotencia (I-04): un reintento del mismo intento de reserva devuelve
  // la cita ya creada en vez de fallar o duplicar.
  const requestHash = bookingRequestHash({
    professionalId: professional.id,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    patientEmail: input.patientEmail,
  })
  const idempotencyKey = resolveIdempotencyKey(options?.idempotencyKey, {
    professionalId: professional.id,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    patientEmail: input.patientEmail,
  })

  const existingBooking = await findIdempotentBooking(idempotencyKey, requestHash)
  if (existingBooking) {
    return { success: true, appointmentId: existingBooking, calendarEventId: '' }
  }

  // Booking rules solo aplican al flujo publico de pacientes.
  // El flujo manual del profesional permite walk-ins y registro retroactivo.
  const ruleCheck = evaluateBookingRules(
    chileLocalDateTimeToISO(input.date, input.startTime),
    new Date(),
    getBookingRules()
  )
  if (!ruleCheck.allowed) {
    return { success: false, error: ruleCheck.message }
  }

  // Excepciones de disponibilidad (feriados/bloqueos) tambien se re-verifican
  // en el flujo publico por si el paciente tenia la pagina abierta hace rato.
  const exceptions = filterExceptionsForDate(
    await getAvailabilityExceptions().catch(() => []),
    professional,
    input.date
  )
  const hasFullDayBlock = exceptions.some(isFullDayException)
  const overlapsBlock = isSlotBusy(
    chileLocalDateTimeToISO(input.date, input.startTime),
    chileLocalDateTimeToISO(input.date, input.endTime),
    exceptionsToBusyIntervals(exceptions, input.date)
  )
  if (hasFullDayBlock || overlapsBlock) {
    return {
      success: false,
      error: 'La agenda no esta disponible en esa fecha u horario. Por favor elige otro.',
    }
  }

  // 2. Adquirir lock atomico para prevenir doble-booking concurrente
  const lockKey = bookingLockKey(professional.id, input.date, input.startTime)
  const locked = acquireLock(lockKey)
  if (!locked) {
    return {
      success: false,
      error: 'Ese horario esta siendo reservado ahora mismo. Intenta en unos segundos.',
    }
  }

  try {
    return await bookWithLock(professional, input, {
      idempotencyKey,
      requestHash,
      actor: 'patient',
    })
  } finally {
    releaseLock(lockKey)
  }
}

export async function bookAppointmentForProfessional(
  professional: Professional,
  input: Omit<AppointmentInput, 'professionalSlug' | 'acceptTerms'>,
): Promise<BookingResult> {
  const lockKey = bookingLockKey(professional.id, input.date, input.startTime)
  const locked = acquireLock(lockKey)
  if (!locked) {
    return {
      success: false,
      error: 'Ese horario esta siendo reservado ahora mismo. Intenta en unos segundos.',
    }
  }

  try {
    return await bookWithLock(
      professional,
      {
        ...input,
        professionalSlug: professional.slug,
        acceptTerms: true,
      },
      { actor: 'professional' }
    )
  } finally {
    releaseLock(lockKey)
  }
}

type BookWithLockOptions = {
  idempotencyKey?: string
  requestHash?: string
  actor: string
}

async function bookWithLock(
  professional: Professional,
  input: AppointmentInput,
  options: BookWithLockOptions,
): Promise<BookingResult> {
  // Verificacion post-lock: confirmar que el slot sigue libre
  const alreadyTaken = await isSlotTaken(professional.id, input.date, input.startTime)
  if (alreadyTaken) {
    return {
      success: false,
      error:   'Ese horario acaba de ser tomado. Por favor elige otro horario.',
    }
  }

  // 3. Crear evento en Google Calendar
  const description = [
    `Paciente: ${input.patientName}`,
    `Email: ${input.patientEmail}`,
    `Teléfono: ${input.patientPhone}`,
    input.patientRut   ? `RUT: ${input.patientRut}` : '',
    input.reason       ? `Motivo: ${input.reason}`  : '',
    '',
    'Estado: confirmada',
    'Origen: AgendaSalud',
  ]
    .filter(Boolean)
    .join('\n')

  const centerUserEmail = professional.centerId
    ? (await getManagedUsers()).find((user) =>
        user.active &&
        ['professional', 'center_admin'].includes(user.role) &&
        user.centerId === professional.centerId
      )?.email
    : ''

  const targetCalendarId =
    professional.calendarId ||
    professional.email ||
    centerUserEmail ||
    process.env.GOOGLE_CALENDAR_ID ||
    ''

  let calendarEventId = ''
  if (targetCalendarId) {
    try {
      calendarEventId = await createCalendarEvent({
        calendarId:    targetCalendarId,
        summary:       `Cita AgendaSalud - ${input.patientName}`,
        description,
        startDateTime: chileLocalDateTimeToISO(input.date, input.startTime),
        endDateTime:   chileLocalDateTimeToISO(input.date, input.endTime),
        timezone:      TIMEZONE,
        attendeeEmail: input.patientEmail,
      })
    } catch {
      // Calendar opcional — no bloquea la cita
    }
  }

  // 4. Registrar la cita (Postgres con exclusion constraints si esta activo;
  //    Google Sheets en el modo historico)
  let id = uuidv4()
  try {
    const created = await createAppointmentRecord(
      {
        id,
        professionalId:        professional.id,
        professionalSlug:      input.professionalSlug,
        patientName:           input.patientName,
        patientEmail:          input.patientEmail,
        patientPhone:          input.patientPhone,
        patientRut:            input.patientRut ?? '',
        reason:                input.reason ?? '',
        date:                  input.date,
        startTime:             input.startTime,
        endTime:               input.endTime,
        timezone:              TIMEZONE,
        status:                'confirmada',
        googleCalendarEventId: calendarEventId,
      },
      {
        idempotencyKey: options.idempotencyKey,
        requestHash: options.requestHash,
        actor: options.actor,
      }
    )
    id = created.appointmentId

    if (created.duplicate) {
      // Reintento idempotente: la cita ya existia. El evento de Calendar
      // recien creado sobra; se elimina best effort.
      if (calendarEventId && targetCalendarId) {
        cancelCalendarEvent(targetCalendarId, calendarEventId).catch(() => {})
      }
      return { success: true, appointmentId: id, calendarEventId: '' }
    }
  } catch (error) {
    if (error instanceof SlotTakenError) {
      if (calendarEventId && targetCalendarId) {
        cancelCalendarEvent(targetCalendarId, calendarEventId).catch(() => {})
      }
      return { success: false, error: error.message }
    }
    throw error
  }

  await upsertPatientFromAppointment({
    name: input.patientName,
    email: input.patientEmail,
    phone: input.patientPhone,
    rut: input.patientRut,
    appointmentDate: `${input.date} ${input.startTime}`,
  }).catch((err) => console.warn('[appointments] Error actualizando paciente:', err))

  // 5. Notificar al profesional (no bloqueante)
  if (professional.email) {
    sendProfessionalNotification({
      professionalName: professional.name,
      professionalEmail: professional.email,
      patientName: input.patientName,
      patientEmail: input.patientEmail,
      patientPhone: input.patientPhone,
      specialty: professional.specialty,
      centerName: professional.centerName,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      appointmentId: id,
    }).catch((err) => console.warn('[appointments] Error notificando profesional:', err))
  }

  return { success: true, appointmentId: id, calendarEventId }
}
