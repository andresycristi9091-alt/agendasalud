import { getBusySlots } from './google/calendar'
import { getAvailabilityByProfessional, getAppointmentsByDateAndProfessional, type Professional } from './google/sheets'
import { generateTimeSlots, isSlotBusy, getDayOfWeekKey, TIMEZONE } from './date'

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
  const dayKey = getDayOfWeekKey(new Date(`${date}T12:00:00`))

  // Bloques de disponibilidad del profesional para ese día
  const availabilityBlocks = await getAvailabilityByProfessional(professional.id)
  const dayBlocks = availabilityBlocks.filter((b) => b.dayOfWeek === dayKey)

  if (dayBlocks.length === 0) return []

  // Citas ya registradas en Sheets
  const existingAppointments = await getAppointmentsByDateAndProfessional(professional.id, date)
  const takenStartTimes = new Set(existingAppointments.map((a) => a.startTime))

  // Horas ocupadas en Google Calendar
  const dayStart = `${date}T00:00:00`
  const dayEnd   = `${date}T23:59:59`
  let busySlots: Array<{ start: string; end: string }> = []

  if (professional.calendarId) {
    try {
      busySlots = await getBusySlots(
        professional.calendarId,
        new Date(`${dayStart}`).toISOString(),
        new Date(`${dayEnd}`).toISOString(),
        TIMEZONE
      )
    } catch {
      // Si falla Calendar, continuamos sin esos datos
    }
  }

  const allSlots: TimeSlot[] = []

  for (const block of dayBlocks) {
    const duration = block.slotDuration || professional.appointmentDurationDefault || 30
    const slots    = generateTimeSlots(date, block.startTime, block.endTime, duration)

    for (const slot of slots) {
      const isTakenInSheets  = takenStartTimes.has(slot.startTime)
      const isTakenInCal     = isSlotBusy(slot.startISO, slot.endISO, busySlots)
      const isInPast         = new Date(slot.startISO) < new Date()

      allSlots.push({
        ...slot,
        available: !isTakenInSheets && !isTakenInCal && !isInPast,
      })
    }
  }

  return allSlots
}
