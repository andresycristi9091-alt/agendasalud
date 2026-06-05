import { v4 as uuidv4 } from 'uuid'
import { createCalendarEvent } from './google/calendar'
import {
  createAppointment,
  isSlotTaken,
  getProfessionalBySlug,
  type Appointment,
} from './google/sheets'
import { TIMEZONE } from './date'
import type { AppointmentInput } from './validation'

export type BookingResult =
  | { success: true;  appointmentId: string; calendarEventId: string }
  | { success: false; error: string }

export async function bookAppointment(input: AppointmentInput): Promise<BookingResult> {
  // 1. Obtener profesional
  const professional = await getProfessionalBySlug(input.professionalSlug)
  if (!professional) {
    return { success: false, error: 'Profesional no encontrado.' }
  }

  // 2. Verificar que el slot aún esté disponible (anti doble reserva)
  const alreadyTaken = await isSlotTaken(professional.id, input.date, input.startTime)
  if (alreadyTaken) {
    return {
      success: false,
      error:   'Ese horario acaba de ser tomado. Por favor elige otro horario.',
    }
  }

  // 3. Crear evento en Google Calendar
  const startISO = `${input.date}T${input.startTime}:00`
  const endISO   = `${input.date}T${input.endTime}:00`

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

  let calendarEventId = ''
  if (professional.calendarId) {
    try {
      calendarEventId = await createCalendarEvent({
        calendarId:    professional.calendarId,
        summary:       `Cita AgendaSalud - ${input.patientName}`,
        description,
        startDateTime: new Date(`${input.date}T${input.startTime}:00`).toISOString(),
        endDateTime:   new Date(`${input.date}T${input.endTime}:00`).toISOString(),
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

  return { success: true, appointmentId: id, calendarEventId }
}
