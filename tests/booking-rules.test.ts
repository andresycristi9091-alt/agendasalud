import { afterEach, describe, expect, test } from 'vitest'
import {
  DEFAULT_BOOKING_RULES,
  evaluateBookingRules,
  expandBusyIntervalsWithBuffer,
  getBookingRules,
} from '@/lib/booking-rules'

const NOW = new Date('2026-07-28T12:00:00-04:00')

describe('getBookingRules', () => {
  afterEach(() => {
    delete process.env.BOOKING_MIN_LEAD_MINUTES
    delete process.env.BOOKING_MAX_ADVANCE_DAYS
    delete process.env.BOOKING_BUFFER_MINUTES
  })

  test('returns defaults when env vars are missing', () => {
    expect(getBookingRules()).toEqual(DEFAULT_BOOKING_RULES)
  })

  test('reads overrides from environment variables', () => {
    process.env.BOOKING_MIN_LEAD_MINUTES = '120'
    process.env.BOOKING_MAX_ADVANCE_DAYS = '30'
    process.env.BOOKING_BUFFER_MINUTES = '10'

    expect(getBookingRules()).toEqual({
      minLeadMinutes: 120,
      maxAdvanceDays: 30,
      bufferMinutes: 10,
    })
  })

  test('ignores invalid or negative env values', () => {
    process.env.BOOKING_MIN_LEAD_MINUTES = 'abc'
    process.env.BOOKING_MAX_ADVANCE_DAYS = '-5'

    expect(getBookingRules()).toEqual(DEFAULT_BOOKING_RULES)
  })
})

describe('evaluateBookingRules', () => {
  const rules = { minLeadMinutes: 60, maxAdvanceDays: 90, bufferMinutes: 0 }

  test('rejects slots in the past', () => {
    const result = evaluateBookingRules('2026-07-28T10:00:00-04:00', NOW, rules)
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('lead_time')
  })

  test('rejects slots inside the minimum lead window', () => {
    const result = evaluateBookingRules('2026-07-28T12:30:00-04:00', NOW, rules)
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('lead_time')
  })

  test('accepts slots exactly at the lead boundary', () => {
    const result = evaluateBookingRules('2026-07-28T13:00:00-04:00', NOW, rules)
    expect(result.allowed).toBe(true)
  })

  test('accepts slots inside the advance window', () => {
    const result = evaluateBookingRules('2026-09-15T10:00:00-04:00', NOW, rules)
    expect(result.allowed).toBe(true)
  })

  test('rejects slots beyond the maximum advance window', () => {
    const result = evaluateBookingRules('2026-12-24T10:00:00-03:00', NOW, rules)
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('advance_window')
  })

  test('violation carries a user-facing message', () => {
    const result = evaluateBookingRules('2026-07-28T12:10:00-04:00', NOW, rules)
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.message.length).toBeGreaterThan(0)
  })

  test('zero lead time only rejects truly past slots', () => {
    const zeroLead = { ...rules, minLeadMinutes: 0 }
    expect(evaluateBookingRules('2026-07-28T12:00:00-04:00', NOW, zeroLead).allowed).toBe(true)
    expect(evaluateBookingRules('2026-07-28T11:59:00-04:00', NOW, zeroLead).allowed).toBe(false)
  })
})

describe('expandBusyIntervalsWithBuffer', () => {
  const busy = [{ start: '2026-08-03T10:00:00-04:00', end: '2026-08-03T10:30:00-04:00' }]

  test('returns intervals unchanged when buffer is zero', () => {
    expect(expandBusyIntervalsWithBuffer(busy, 0)).toEqual(busy)
  })

  test('expands intervals on both sides by the buffer', () => {
    const [expanded] = expandBusyIntervalsWithBuffer(busy, 10)
    expect(new Date(expanded.start).getTime()).toBe(
      new Date('2026-08-03T09:50:00-04:00').getTime()
    )
    expect(new Date(expanded.end).getTime()).toBe(
      new Date('2026-08-03T10:40:00-04:00').getTime()
    )
  })

  test('does not mutate the original intervals', () => {
    const original = [{ start: '2026-08-03T10:00:00-04:00', end: '2026-08-03T10:30:00-04:00' }]
    expandBusyIntervalsWithBuffer(original, 15)
    expect(original[0].start).toBe('2026-08-03T10:00:00-04:00')
  })
})
