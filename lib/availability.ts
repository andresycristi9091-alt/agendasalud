import { getBusySlots } from './google/calendar'
import { getAvailabilityByProfessional, getAppointmentsByDateAndProfessional, getManagedUsers, type Professional } from './google/sheets'
import { generateTimeSlots, isSlotBusy, getDayOfWeekKey, TIMEZONE, chileDayBoundary } from './date'

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

  // Citas ya registradas en Sheets
  const existingAppointments = await getAppointmentsByDateAndProfessional(professional.id, date)
  const takenStartTimes = new Set(existingAppointments.map((a) => a.startTime))

  // Horas ocupadas en Google Calendar
  let busySlots: Array<{ start: string; end: string }> = []

  const centerUserEmail = professional.centerId
    ? (await getManagedUsers()).find((user) => user.active && user.role === 'user' && user.centerId === professional.centerId)?.email
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
      const isTakenInCal     = isSlotBusy(slot.startISO, slot.endISO, busySlots)
      const isInPast         = new Date(slot.startISO) < new Date()

      allSlots.push({
        ...slot,
        available: !isTakenInSheets && !isTakenInCal && !isInPast,
      })
    }
  }

  // Ordenar por hora de inicio
  allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))

  return allSlots
}
