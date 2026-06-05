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

// Día de semana en clave a partir de una fecha string 'YYYY-MM-DD'
export function getDayOfWeekKey(dateStr: string): string {
  // Usamos mediodía para evitar problemas de zona horaria
  const d = new Date(`${dateStr}T12:00:00`)
  return DAY_MAP[d.getDay()] ?? 'monday'
}

// Generar slots entre startTime y endTime con duración en minutos
export function generateTimeSlots(
  date:         string,
  startTime:    string,
  endTime:      string,
  slotDuration: number
): Array<{ startTime: string; endTime: string; startISO: string; endISO: string }> {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  const startMinutes = sh * 60 + sm
  const endMinutes   = eh * 60 + em

  const slots: Array<{ startTime: string; endTime: string; startISO: string; endISO: string }> = []

  let current = startMinutes
  while (current + slotDuration <= endMinutes) {
    const next = current + slotDuration

    const startHH = String(Math.floor(current / 60)).padStart(2, '0')
    const startMM = String(current % 60).padStart(2, '0')
    const endHH   = String(Math.floor(next / 60)).padStart(2, '0')
    const endMM   = String(next % 60).padStart(2, '0')

    const startISO = new Date(`${date}T${startHH}:${startMM}:00`).toISOString()
    const endISO   = new Date(`${date}T${endHH}:${endMM}:00`).toISOString()

    slots.push({
      startTime: `${startHH}:${startMM}`,
      endTime:   `${endHH}:${endMM}`,
      startISO,
      endISO,
    })

    current = next
  }

  return slots
}

// Verificar si un slot se superpone con periodos ocupados
export function isSlotBusy(
  slotStart: string,
  slotEnd:   string,
  busySlots: Array<{ start: string; end: string }>
): boolean {
  const s = new Date(slotStart).getTime()
  const e = new Date(slotEnd).getTime()

  return busySlots.some((b) => {
    const bs = new Date(b.start).getTime()
    const be = new Date(b.end).getTime()
    return s < be && e > bs
  })
}

// Hoy como 'YYYY-MM-DD'
export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}
