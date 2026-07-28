import { describe, expect, test } from 'vitest'
import {
  exceptionAppliesTo,
  exceptionsToBusyIntervals,
  filterExceptionsForDate,
  isFullDayException,
  type AvailabilityException,
} from '@/lib/availability-exceptions'

const DATE = '2026-08-03'

function makeException(overrides?: Partial<AvailabilityException>): AvailabilityException {
  return {
    id: 'exc-1',
    scope: 'professional',
    scopeId: 'prof-1',
    date: DATE,
    startTime: '',
    endTime: '',
    reason: 'Feriado',
    createdAt: '',
    ...overrides,
  }
}

const professional = { id: 'prof-1', centerId: 'center-neuroplus' }

describe('isFullDayException', () => {
  test('true when times are empty', () => {
    expect(isFullDayException(makeException())).toBe(true)
  })

  test('false when both times are set', () => {
    expect(isFullDayException(makeException({ startTime: '13:00', endTime: '15:00' }))).toBe(false)
  })

  test('true when only one time is set (registro incompleto)', () => {
    expect(isFullDayException(makeException({ startTime: '13:00' }))).toBe(true)
  })
})

describe('exceptionAppliesTo', () => {
  test('professional scope matches only that professional', () => {
    expect(exceptionAppliesTo(makeException(), professional, DATE)).toBe(true)
    expect(exceptionAppliesTo(makeException(), { id: 'prof-2', centerId: 'center-neuroplus' }, DATE)).toBe(false)
  })

  test('center scope matches professionals of the center', () => {
    const exception = makeException({ scope: 'center', scopeId: 'center-neuroplus' })
    expect(exceptionAppliesTo(exception, professional, DATE)).toBe(true)
    expect(exceptionAppliesTo(exception, { id: 'prof-2', centerId: 'otro-centro' }, DATE)).toBe(false)
  })

  test('center scope does not match professionals without center', () => {
    const exception = makeException({ scope: 'center', scopeId: 'center-neuroplus' })
    expect(exceptionAppliesTo(exception, { id: 'prof-3' }, DATE)).toBe(false)
  })

  test('all scope matches everyone', () => {
    const exception = makeException({ scope: 'all', scopeId: '' })
    expect(exceptionAppliesTo(exception, professional, DATE)).toBe(true)
    expect(exceptionAppliesTo(exception, { id: 'prof-9' }, DATE)).toBe(true)
  })

  test('never matches a different date', () => {
    expect(exceptionAppliesTo(makeException(), professional, '2026-08-04')).toBe(false)
  })
})

describe('filterExceptionsForDate', () => {
  test('keeps only applicable exceptions', () => {
    const exceptions = [
      makeException({ id: 'a' }),
      makeException({ id: 'b', scopeId: 'prof-2' }),
      makeException({ id: 'c', scope: 'all', scopeId: '' }),
      makeException({ id: 'd', date: '2026-08-04' }),
    ]

    const result = filterExceptionsForDate(exceptions, professional, DATE)
    expect(result.map((e) => e.id)).toEqual(['a', 'c'])
  })
})

describe('exceptionsToBusyIntervals', () => {
  test('full day exception blocks the whole day', () => {
    const [interval] = exceptionsToBusyIntervals([makeException()], DATE)
    expect(interval.start).toBe('2026-08-03T00:00:00-04:00')
    expect(interval.end).toBe('2026-08-03T23:59:00-04:00')
  })

  test('partial exception blocks only its range', () => {
    const [interval] = exceptionsToBusyIntervals(
      [makeException({ startTime: '13:00', endTime: '15:00' })],
      DATE
    )
    expect(interval.start).toBe('2026-08-03T13:00:00-04:00')
    expect(interval.end).toBe('2026-08-03T15:00:00-04:00')
  })
})
