export const TIMEZONE = 'America/Santiago'

const DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

export function getDayOfWeekKey(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return DAY_MAP[date.getUTCDay()] ?? 'monday'
}

export function generateTimeSlots(
  date: string,
  startTime: string,
  endTime: string,
  slotDuration: number
): Array<{ startTime: string; endTime: string; startISO: string; endISO: string }> {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em
  const slots: Array<{ startTime: string; endTime: string; startISO: string; endISO: string }> = []

  let current = startMinutes
  while (current + slotDuration <= endMinutes) {
    const next = current + slotDuration
    const startHH = String(Math.floor(current / 60)).padStart(2, '0')
    const startMM = String(current % 60).padStart(2, '0')
    const endHH = String(Math.floor(next / 60)).padStart(2, '0')
    const endMM = String(next % 60).padStart(2, '0')

    const slotStart = `${startHH}:${startMM}`
    const slotEnd = `${endHH}:${endMM}`

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      startISO: chileLocalDateTimeToISO(date, slotStart),
      endISO: chileLocalDateTimeToISO(date, slotEnd),
    })

    current = next
  }

  return slots
}

export function isSlotBusy(
  slotStart: string,
  slotEnd: string,
  busySlots: Array<{ start: string; end: string }>
): boolean {
  const start = new Date(slotStart).getTime()
  const end = new Date(slotEnd).getTime()

  return busySlots.some((busy) => {
    const busyStart = new Date(busy.start).getTime()
    const busyEnd = new Date(busy.end).getTime()
    return start < busyEnd && end > busyStart
  })
}

export function todayString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function chileLocalDateTimeToISO(date: string, time: string): string {
  return `${date}T${time}:00${getChileOffset(date)}`
}

export function chileDayBoundary(date: string, boundary: 'start' | 'end'): string {
  return chileLocalDateTimeToISO(date, boundary === 'start' ? '00:00' : '23:59')
}

function getChileOffset(date: string): '-03:00' | '-04:00' {
  const [year, month, day] = date.split('-').map(Number)
  const current = Date.UTC(year, month - 1, day)
  const dstEnd = firstSundayUtc(year, 4)
  const dstStart = firstSundayUtc(year, 9)

  return current >= dstEnd && current < dstStart ? '-04:00' : '-03:00'
}

function firstSundayUtc(year: number, month: number): number {
  for (let day = 1; day <= 7; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day))
    if (date.getUTCDay() === 0) return date.getTime()
  }
  return Date.UTC(year, month - 1, 1)
}
