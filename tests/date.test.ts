import { describe, expect, test } from 'vitest'
import {
  chileDayBoundary,
  chileLocalDateTimeToISO,
  generateTimeSlots,
  getDayOfWeekKey,
  isSlotBusy,
  todayString,
} from '@/lib/date'

describe('getDayOfWeekKey', () => {
  test('returns monday for a known Monday', () => {
    expect(getDayOfWeekKey('2026-07-27')).toBe('monday')
  })

  test('returns sunday for a known Sunday', () => {
    expect(getDayOfWeekKey('2026-08-02')).toBe('sunday')
  })
})

describe('generateTimeSlots', () => {
  test('generates consecutive slots covering the block', () => {
    const slots = generateTimeSlots('2026-08-03', '09:00', '10:30', 30)

    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '09:30', '10:00'])
    expect(slots.map((s) => s.endTime)).toEqual(['09:30', '10:00', '10:30'])
  })

  test('drops a trailing partial slot that does not fit', () => {
    const slots = generateTimeSlots('2026-08-03', '09:00', '09:50', 30)
    expect(slots.map((s) => s.startTime)).toEqual(['09:00'])
  })

  test('returns empty array when the block is shorter than the duration', () => {
    expect(generateTimeSlots('2026-08-03', '09:00', '09:20', 30)).toEqual([])
  })

  test('produces ISO datetimes anchored to Chile timezone', () => {
    const [slot] = generateTimeSlots('2026-07-28', '09:00', '09:30', 30)
    expect(slot.startISO).toBe('2026-07-28T09:00:00-04:00')
    expect(slot.endISO).toBe('2026-07-28T09:30:00-04:00')
  })
})

describe('isSlotBusy', () => {
  const busy = [{ start: '2026-08-03T10:00:00-04:00', end: '2026-08-03T11:00:00-04:00' }]

  test('detects full overlap', () => {
    expect(isSlotBusy('2026-08-03T10:00:00-04:00', '2026-08-03T10:30:00-04:00', busy)).toBe(true)
  })

  test('detects partial overlap', () => {
    expect(isSlotBusy('2026-08-03T09:45:00-04:00', '2026-08-03T10:15:00-04:00', busy)).toBe(true)
  })

  test('adjacent slots are not busy', () => {
    expect(isSlotBusy('2026-08-03T09:00:00-04:00', '2026-08-03T10:00:00-04:00', busy)).toBe(false)
    expect(isSlotBusy('2026-08-03T11:00:00-04:00', '2026-08-03T11:30:00-04:00', busy)).toBe(false)
  })

  test('returns false with no busy slots', () => {
    expect(isSlotBusy('2026-08-03T09:00:00-04:00', '2026-08-03T10:00:00-04:00', [])).toBe(false)
  })
})

describe('chileLocalDateTimeToISO', () => {
  test('uses -04:00 during Chilean winter (no DST)', () => {
    expect(chileLocalDateTimeToISO('2026-06-15', '10:00')).toBe('2026-06-15T10:00:00-04:00')
  })

  test('uses -03:00 during Chilean summer (DST)', () => {
    expect(chileLocalDateTimeToISO('2026-01-15', '10:00')).toBe('2026-01-15T10:00:00-03:00')
  })
})

describe('chileDayBoundary', () => {
  test('builds start and end of day boundaries', () => {
    expect(chileDayBoundary('2026-06-15', 'start')).toBe('2026-06-15T00:00:00-04:00')
    expect(chileDayBoundary('2026-06-15', 'end')).toBe('2026-06-15T23:59:00-04:00')
  })
})

describe('todayString', () => {
  test('returns a YYYY-MM-DD string', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
