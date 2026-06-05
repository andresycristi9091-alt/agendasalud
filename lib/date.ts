import { format, addMinutes, parseISO, isWithinInterval, parse } from 'date-fns'
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'

export const TIMEZONE = 'America/Santiago'

// Día de la semana en español → clave de dayOfWeek
const DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

export function getDayOfWeekKey(date: Date): string {
  const zoned = toZonedTime(date, TIMEZONE)
  return DAY_MAP[zoned.getDay()]
}

// Generar slots de tiempo entre startTime y endTime con slotDuration (minutos)
export function generateTimeSlots(
  date:          string, // 'YYYY-MM-DD'
  startTime:     string, // 'HH:mm'
  endTime:       string, // 'HH:mm'
  slotDuration:  number  // minutos
): Array<{ startTime: string; endTime: string; startISO: string; endISO: string }> {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  const base      = parseISO(`${date}T${startTime}:00`)
  const endBase   = parseISO(`${date}T${endTime}:00`)
  const startUTC  = fromZonedTime(base, TIMEZONE)
  const endUTC    = fromZonedTime(endBase, TIMEZONE)

  const slots: Array<{ startTime: string; endTime: string; startISO: string; endISO: string }> = []
  let current = startUTC

  while (true) {
    const next = addMinutes(current, slotDuration)
    if (next > endUTC) break

    slots.push({
      startTime: formatInTimeZone(current, TIMEZONE, 'HH:mm'),
      endTime:   formatInTimeZone(next, TIMEZONE, 'HH:mm'),
      startISO:  current.toISOString(),
      endISO:    next.toISOString(),
    })

    current = next
  }

  return slots
}

// Verificar si un slot se superpone con periodos ocupados
export function isSlotBusy(
  slotStart: string, // ISO
  slotEnd:   string, // ISO
  busySlots: Array<{ start: string; end: string }>
): boolean {
  const s = new Date(slotStart)
  const e = new Date(slotEnd)

  return busySlots.some((b) => {
    const bs = new Date(b.start)
    const be = new Date(b.end)
    return s < be && e > bs
  })
}

// Formatear fecha para mostrar en español
export function formatDateDisplay(dateStr: string): string {
  const date  = parseISO(dateStr + 'T12:00:00')
  const zoned = toZonedTime(date, TIMEZONE)
  return formatInTimeZone(date, TIMEZONE, "EEEE d 'de' MMMM 'de' yyyy")
}

// Hoy en America/Santiago como 'YYYY-MM-DD'
export function todayInSantiago(): string {
  return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd')
}

// Calcular endTime sumando minutos a startTime en un date
export function addMinutesToTime(date: string, time: string, minutes: number): string {
  const base    = parseISO(`${date}T${time}:00`)
  const zoned   = fromZonedTime(base, TIMEZONE)
  const result  = addMinutes(zoned, minutes)
  return formatInTimeZone(result, TIMEZONE, 'HH:mm')
}
