export type BookingRules = {
  minLeadMinutes: number
  maxAdvanceDays: number
  bufferMinutes: number
}

export type BookingRuleViolation = 'lead_time' | 'advance_window'

export type BookingRuleResult =
  | { allowed: true }
  | { allowed: false; reason: BookingRuleViolation; message: string }

export const DEFAULT_BOOKING_RULES: BookingRules = {
  minLeadMinutes: 60,
  maxAdvanceDays: 90,
  bufferMinutes: 0,
}

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

function readNonNegativeInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

export function getBookingRules(): BookingRules {
  return {
    minLeadMinutes: readNonNegativeInt(process.env.BOOKING_MIN_LEAD_MINUTES, DEFAULT_BOOKING_RULES.minLeadMinutes),
    maxAdvanceDays: readNonNegativeInt(process.env.BOOKING_MAX_ADVANCE_DAYS, DEFAULT_BOOKING_RULES.maxAdvanceDays),
    bufferMinutes: readNonNegativeInt(process.env.BOOKING_BUFFER_MINUTES, DEFAULT_BOOKING_RULES.bufferMinutes),
  }
}

export function evaluateBookingRules(
  slotStartISO: string,
  now: Date,
  rules: BookingRules
): BookingRuleResult {
  const slotStart = new Date(slotStartISO).getTime()
  if (!Number.isFinite(slotStart)) {
    return { allowed: false, reason: 'lead_time', message: 'Horario invalido.' }
  }

  const minStart = now.getTime() + rules.minLeadMinutes * MINUTE_MS
  if (slotStart < minStart) {
    return {
      allowed: false,
      reason: 'lead_time',
      message:
        rules.minLeadMinutes > 0
          ? `Las citas requieren al menos ${rules.minLeadMinutes} minutos de anticipacion.`
          : 'Ese horario ya paso. Elige un horario futuro.',
    }
  }

  const maxStart = now.getTime() + rules.maxAdvanceDays * DAY_MS
  if (slotStart > maxStart) {
    return {
      allowed: false,
      reason: 'advance_window',
      message: `Solo se pueden agendar citas hasta ${rules.maxAdvanceDays} dias hacia adelante.`,
    }
  }

  return { allowed: true }
}

export function expandBusyIntervalsWithBuffer(
  busy: Array<{ start: string; end: string }>,
  bufferMinutes: number
): Array<{ start: string; end: string }> {
  if (bufferMinutes <= 0) return busy

  const bufferMs = bufferMinutes * MINUTE_MS

  return busy.map((interval) => ({
    start: new Date(new Date(interval.start).getTime() - bufferMs).toISOString(),
    end: new Date(new Date(interval.end).getTime() + bufferMs).toISOString(),
  }))
}
