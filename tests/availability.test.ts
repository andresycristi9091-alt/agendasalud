import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getAvailableSlotsForDate } from '@/lib/availability'
import type { Professional } from '@/lib/google/sheets'

vi.mock('@/lib/google/calendar', () => ({
  getBusySlots: vi.fn(),
}))

vi.mock('@/lib/google/sheets', () => ({
  getAvailabilityByProfessional: vi.fn(),
  getAppointmentsByDateAndProfessional: vi.fn(),
  getAvailabilityExceptions: vi.fn(),
  getManagedUsers: vi.fn(),
}))

import { getBusySlots } from '@/lib/google/calendar'
import {
  getAppointmentsByDateAndProfessional,
  getAvailabilityByProfessional,
  getAvailabilityExceptions,
  getManagedUsers,
} from '@/lib/google/sheets'

const professional: Professional = {
  id: 'prof-1',
  slug: 'dr-garcia',
  name: 'Dr. Garcia',
  specialty: 'Neurologia',
  centerName: 'NeuroPlus',
  email: 'garcia@example.com',
  phone: '',
  calendarId: 'cal-1',
  publicDescription: '',
  appointmentDurationDefault: 30,
  timezone: 'America/Santiago',
  active: true,
  professionalType: 'Neurologo',
  photoUrl: '',
  centerId: '',
  createdAt: '',
  updatedAt: '',
} as Professional

// Lunes 3 de agosto de 2026, invierno chileno (-04:00)
const DATE = '2026-08-03'

type ExceptionFixture = {
  scope: 'professional' | 'center' | 'all'
  scopeId: string
  startTime?: string
  endTime?: string
}

function setupMocks(options?: {
  appointments?: Array<{ startTime: string; endTime: string }>
  busy?: Array<{ start: string; end: string }>
  exceptions?: ExceptionFixture[]
}) {
  vi.mocked(getAvailabilityByProfessional).mockResolvedValue([
    {
      id: 'av-1',
      professionalId: 'prof-1',
      dayOfWeek: DATE,
      startTime: '09:00',
      endTime: '12:00',
      slotDuration: 30,
      active: true,
    },
  ] as never)

  vi.mocked(getAppointmentsByDateAndProfessional).mockResolvedValue(
    (options?.appointments ?? []).map((a, index) => ({
      id: `apt-${index}`,
      professionalId: 'prof-1',
      date: DATE,
      startTime: a.startTime,
      endTime: a.endTime,
      status: 'confirmada',
    })) as never
  )

  vi.mocked(getBusySlots).mockResolvedValue(options?.busy ?? [])
  vi.mocked(getManagedUsers).mockResolvedValue([] as never)
  vi.mocked(getAvailabilityExceptions).mockResolvedValue(
    (options?.exceptions ?? []).map((exception, index) => ({
      id: `exc-${index}`,
      scope: exception.scope,
      scopeId: exception.scopeId,
      date: DATE,
      startTime: exception.startTime ?? '',
      endTime: exception.endTime ?? '',
      reason: 'test',
      createdAt: '',
    })) as never
  )
}

describe('getAvailableSlotsForDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T07:00:00-04:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    delete process.env.BOOKING_MIN_LEAD_MINUTES
    delete process.env.BOOKING_MAX_ADVANCE_DAYS
    delete process.env.BOOKING_BUFFER_MINUTES
  })

  test('generates slots from the availability block', async () => {
    setupMocks()

    const slots = await getAvailableSlotsForDate(professional, DATE)

    expect(slots.map((s) => s.startTime)).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    ])
    expect(slots.every((s) => s.available)).toBe(true)
  })

  test('generates slots when Sheets returns slotDuration as string (regression)', async () => {
    setupMocks()
    vi.mocked(getAvailabilityByProfessional).mockResolvedValue([
      {
        id: 'av-1',
        professionalId: 'prof-1',
        dayOfWeek: DATE,
        startTime: '09:00',
        endTime: '11:00',
        slotDuration: '30',
        active: 'TRUE',
      },
    ] as never)

    const slots = await getAvailableSlotsForDate(professional, DATE)
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '09:30', '10:00', '10:30'])
  })

  test('marks slots taken in Sheets as unavailable', async () => {
    setupMocks({ appointments: [{ startTime: '10:00', endTime: '10:30' }] })

    const slots = await getAvailableSlotsForDate(professional, DATE)
    const byStart = new Map(slots.map((s) => [s.startTime, s.available]))

    expect(byStart.get('10:00')).toBe(false)
    expect(byStart.get('09:30')).toBe(true)
    expect(byStart.get('10:30')).toBe(true)
  })

  test('marks slots busy in Google Calendar as unavailable', async () => {
    setupMocks({ busy: [{ start: '2026-08-03T11:00:00-04:00', end: '2026-08-03T11:30:00-04:00' }] })

    const slots = await getAvailableSlotsForDate(professional, DATE)
    const byStart = new Map(slots.map((s) => [s.startTime, s.available]))

    expect(byStart.get('11:00')).toBe(false)
    expect(byStart.get('11:30')).toBe(true)
  })

  test('applies buffer minutes around existing appointments', async () => {
    process.env.BOOKING_BUFFER_MINUTES = '15'
    setupMocks({ appointments: [{ startTime: '10:00', endTime: '10:30' }] })

    const slots = await getAvailableSlotsForDate(professional, DATE)
    const byStart = new Map(slots.map((s) => [s.startTime, s.available]))

    // Con buffer de 15 min, los slots adyacentes a la cita 10:00-10:30 quedan bloqueados
    expect(byStart.get('09:30')).toBe(false)
    expect(byStart.get('10:00')).toBe(false)
    expect(byStart.get('10:30')).toBe(false)
    expect(byStart.get('09:00')).toBe(true)
    expect(byStart.get('11:00')).toBe(true)
  })

  test('enforces the minimum lead time', async () => {
    vi.setSystemTime(new Date('2026-08-03T08:31:00-04:00'))
    setupMocks()

    const slots = await getAvailableSlotsForDate(professional, DATE)
    const byStart = new Map(slots.map((s) => [s.startTime, s.available]))

    // Con anticipacion minima de 60 min desde las 08:31, el slot de 09:00 no alcanza
    expect(byStart.get('09:00')).toBe(false)
    expect(byStart.get('09:30')).toBe(false)
    expect(byStart.get('10:00')).toBe(true)
  })

  test('returns empty array when there are no blocks for that date', async () => {
    setupMocks()
    vi.mocked(getAvailabilityByProfessional).mockResolvedValue([] as never)

    const slots = await getAvailableSlotsForDate(professional, DATE)
    expect(slots).toEqual([])
  })

  test('a full day exception for the professional empties the agenda', async () => {
    setupMocks({ exceptions: [{ scope: 'professional', scopeId: 'prof-1' }] })

    const slots = await getAvailableSlotsForDate(professional, DATE)
    expect(slots).toEqual([])
  })

  test('a full day exception for another professional does not affect the agenda', async () => {
    setupMocks({ exceptions: [{ scope: 'professional', scopeId: 'prof-2' }] })

    const slots = await getAvailableSlotsForDate(professional, DATE)
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((s) => s.available)).toBe(true)
  })

  test('a global full day exception (feriado) empties the agenda', async () => {
    setupMocks({ exceptions: [{ scope: 'all', scopeId: '' }] })

    const slots = await getAvailableSlotsForDate(professional, DATE)
    expect(slots).toEqual([])
  })

  test('a partial exception blocks only the overlapping slots', async () => {
    setupMocks({
      exceptions: [{ scope: 'professional', scopeId: 'prof-1', startTime: '10:00', endTime: '11:00' }],
    })

    const slots = await getAvailableSlotsForDate(professional, DATE)
    const byStart = new Map(slots.map((s) => [s.startTime, s.available]))

    expect(byStart.get('09:30')).toBe(true)
    expect(byStart.get('10:00')).toBe(false)
    expect(byStart.get('10:30')).toBe(false)
    expect(byStart.get('11:00')).toBe(true)
  })
})
