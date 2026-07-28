import { getBusySlots } from './google/calendar'
import {
  getAvailabilityByProfessional,
  getAppointmentsByDateAndProfessional,
  getAvailabilityExceptions,
  getManagedUsers,
  type Professional,
} from './google/sheets'
import { generateTimeSlots, isSlotBusy, getDayOfWeekKey, TIMEZONE, chileDayBoundary, chileLocalDateTimeToISO } from './date'
import { evaluateBookingRules, expandBusyIntervalsWithBuffer, getBookingRules } from './booking-rules'
import {
  exceptionsToBusyIntervals,
  filterExceptionsForDate,
  isFullDayException,
} from './availability-exceptions'

export type TimeSlot = {
  startTime: string
  endTime:   string
  startISO:  string
  endISO:    string
  available: boolean
}

export async function getAvailableSlotsForDate(
  professional: Professional,
  date: string
): Promise<TimeSlot[]> {
  // Determinar día de la semana
  const dayKey = getDayOfWeekKey(date)

  // Bloques de disponibilidad del profesional para ese día
  const availabilityBlocks = await getAvailabilityByProfessional(professional.id)
  const dayBlocks = availabilityBlocks.filter((b) => b.dayOfWeek === date || b.dayOfWeek === dayKey)

  if (dayBlocks.length === 0) return []

  // Excepciones: feriados y bloqueos puntuales por profesional, centro o globales
  const allExceptions = await getAvailabilityExceptions().catch(() => [])
  const dayExceptions = filterExceptionsForDate(allExceptions, professional, date)
  if (dayExceptions.some(isFullDayException)) return []

  const exceptionIntervals = exceptionsToBusyIntervals(dayExceptions, date)

  const bookingRules = getBookingRules()

  // Citas ya registradas en Sheets
  const existingAppointments = await getAppointmentsByDateAndProfessional(professional.id, date)
  const takenStartTimes = new Set(existingAppointments.map((a) => a.startTime))
  const sheetBusyIntervals = existingAppointments.map((appointment) => ({
    start: chileLocalDateTimeToISO(date, appointment.startTime),
    end: chileLocalDateTimeToISO(date, appointment.endTime),
  }))

  // Horas ocupadas en Google Calendar
  let busySlots: Array<{ start: string; end: string }> = []

  const centerUserEmail = professional.centerId
    ? (await getManagedUsers()).find((user) =>
        user.active &&
        ['professional', 'center_admin'].includes(user.role) &&
        user.centerId === professional.centerId
      )?.email
    : ''
  const targetCalendarId = professional.calendarId || professional.email || centerUserEmail || process.env.GOOGLE_CALENDAR_ID || ''

  if (targetCalendarId) {
    try {
      busySlots = await getBusySlots(
        targetCalendarId,
        chileDayBoundary(date, 'start'),
        chileDayBoundary(date, 'end'),
        TIMEZONE
      )
    } catch (err) {
      console.warn('[availability] Google Calendar no disponible, continuando sin datos de calendario:', err)
    }
  }

  // Buffer entre citas: expandir intervalos ocupados (Sheets + Calendar).
  // Las excepciones se agregan sin buffer: bloquean exactamente su rango.
  const blockedIntervals = [
    ...expandBusyIntervalsWithBuffer(
      [...sheetBusyIntervals, ...busySlots],
      bookingRules.bufferMinutes
    ),
    ...exceptionIntervals,
  ]

  const now = new Date()
  const seen = new Set<string>()
  const allSlots: TimeSlot[] = []

  for (const block of dayBlocks) {
    const duration = block.slotDuration || professional.appointmentDurationDefault || 30
    const slots    = generateTimeSlots(date, block.startTime, block.endTime, duration)

    for (const slot of slots) {
      // Deduplicar slots que aparecen en multiples bloques solapados
      if (seen.has(slot.startTime)) continue
      seen.add(slot.startTime)

      const isTakenInSheets  = takenStartTimes.has(slot.startTime)
      const isBlocked        = isSlotBusy(slot.startISO, slot.endISO, blockedIntervals)
      const passesRules      = evaluateBookingRules(slot.startISO, now, bookingRules).allowed

      allSlots.push({
        ...slot,
        available: !isTakenInSheets && !isBlocked && passesRules,
      })
    }
  }

  // Ordenar por hora de inicio
  allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))

  return allSlots
}
