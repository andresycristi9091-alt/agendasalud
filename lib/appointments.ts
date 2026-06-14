import { v4 as uuidv4 } from 'uuid'
import { createCalendarEvent } from './google/calendar'
import {
  createAppointment,
  isSlotTaken,
  getProfessionalBySlug,
  getManagedUsers,
} from './google/sheets'
import { TIMEZONE, chileLocalDateTimeToISO } from './date'
import { acquireLock, releaseLock, bookingLockKey } from './mutex'
import { sendProfessionalNotification } from './email'
import type { AppointmentInput } from './validation'
import type { Professional } from './google/sheets'

export type BookingResult =
  | { success: true;  appointmentId: string; calendarEventId: string }
  | { success: false; error: string }

export async function bookAppointment(input: AppointmentInput): Promise<BookingResult> {
  // 1. Obtener profesional
  const professional = await getProfessionalBySlug(input.professionalSlug)
  if (!professional) {
    return { success: false, error: 'Profesional no encontrado.' }
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
    return await bookWithLock(professional, input)
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
    return await bookWithLock(professional, {
      ...input,
      professionalSlug: professional.slug,
      acceptTerms: true,
    })
  } finally {
    releaseLock(lockKey)
  }
}

async function bookWithLock(
  professional: Professional,
  input: AppointmentInput,
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
    ? (await getManagedUsers()).find((user) => user.active && user.role === 'user' && user.centerId === professional.centerId)?.email
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

  // 4. Registrar en Google Sheets
  const id = uuidv4()
  await createAppointment({
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
  })

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
