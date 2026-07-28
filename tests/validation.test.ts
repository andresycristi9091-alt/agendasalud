import { describe, expect, test } from 'vitest'
import {
  AdminUserCreateSchema,
  AppointmentSchema,
  AvailabilitySchema,
  ManualAppointmentSchema,
  StrongPasswordSchema,
  UpdateStatusSchema,
} from '@/lib/validation'

function futureDate(daysAhead: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}

const validAppointment = {
  professionalSlug: 'dr-garcia',
  patientName: 'Maria Perez',
  patientEmail: 'maria@example.com',
  patientPhone: '+56912345678',
  date: futureDate(7),
  startTime: '10:00',
  endTime: '10:30',
  acceptTerms: true,
}

describe('StrongPasswordSchema', () => {
  test('accepts a compliant password', () => {
    expect(StrongPasswordSchema.safeParse('Segura123').success).toBe(true)
  })

  test('rejects passwords without uppercase', () => {
    expect(StrongPasswordSchema.safeParse('segura123').success).toBe(false)
  })

  test('rejects passwords without number', () => {
    expect(StrongPasswordSchema.safeParse('SeguraSiempre').success).toBe(false)
  })

  test('rejects short passwords', () => {
    expect(StrongPasswordSchema.safeParse('Se1').success).toBe(false)
  })
})

describe('AppointmentSchema', () => {
  test('accepts a valid appointment', () => {
    const result = AppointmentSchema.safeParse(validAppointment)
    expect(result.success).toBe(true)
  })

  test('rejects past dates', () => {
    const result = AppointmentSchema.safeParse({ ...validAppointment, date: '2020-01-01' })
    expect(result.success).toBe(false)
  })

  test('rejects endTime before startTime', () => {
    const result = AppointmentSchema.safeParse({
      ...validAppointment,
      startTime: '11:00',
      endTime: '10:00',
    })
    expect(result.success).toBe(false)
  })

  test('rejects slug with invalid characters', () => {
    const result = AppointmentSchema.safeParse({
      ...validAppointment,
      professionalSlug: 'Dr Garcia!',
    })
    expect(result.success).toBe(false)
  })

  test('rejects when terms are not accepted', () => {
    const result = AppointmentSchema.safeParse({ ...validAppointment, acceptTerms: false })
    expect(result.success).toBe(false)
  })

  test('rejects invalid email', () => {
    const result = AppointmentSchema.safeParse({ ...validAppointment, patientEmail: 'no-email' })
    expect(result.success).toBe(false)
  })
})

describe('ManualAppointmentSchema', () => {
  test('accepts a valid manual appointment without terms', () => {
    const result = ManualAppointmentSchema.safeParse({
      professionalId: 'prof-1',
      patientName: 'Juan Soto',
      patientEmail: 'juan@example.com',
      patientPhone: '+56998765432',
      date: futureDate(1),
      startTime: '15:00',
      endTime: '15:30',
    })
    expect(result.success).toBe(true)
  })

  test('rejects startTime equal to endTime', () => {
    const result = ManualAppointmentSchema.safeParse({
      professionalId: 'prof-1',
      patientName: 'Juan Soto',
      patientEmail: 'juan@example.com',
      patientPhone: '+56998765432',
      date: futureDate(1),
      startTime: '15:00',
      endTime: '15:00',
    })
    expect(result.success).toBe(false)
  })
})

describe('AvailabilitySchema', () => {
  const base = {
    professionalId: 'prof-1',
    startTime: '09:00',
    endTime: '13:00',
    slotDuration: 30,
  }

  test('accepts legacy weekday keys', () => {
    expect(AvailabilitySchema.safeParse({ ...base, dayOfWeek: 'monday' }).success).toBe(true)
  })

  test('accepts exact dates', () => {
    expect(AvailabilitySchema.safeParse({ ...base, dayOfWeek: '2026-08-03' }).success).toBe(true)
  })

  test('rejects arbitrary strings', () => {
    expect(AvailabilitySchema.safeParse({ ...base, dayOfWeek: 'algun-dia' }).success).toBe(false)
  })

  test('rejects slot durations outside 10-120', () => {
    expect(AvailabilitySchema.safeParse({ ...base, dayOfWeek: 'monday', slotDuration: 5 }).success).toBe(false)
    expect(AvailabilitySchema.safeParse({ ...base, dayOfWeek: 'monday', slotDuration: 240 }).success).toBe(false)
  })
})

describe('AdminUserCreateSchema', () => {
  test('accepts professional, center_admin and patient roles', () => {
    for (const role of ['professional', 'center_admin', 'patient']) {
      const result = AdminUserCreateSchema.safeParse({
        email: 'nuevo@agendasalud.cl',
        password: 'Segura123',
        name: 'Usuario Nuevo',
        role,
      })
      expect(result.success).toBe(true)
    }
  })

  test('rejects legacy admin role', () => {
    const result = AdminUserCreateSchema.safeParse({
      email: 'nuevo@agendasalud.cl',
      password: 'Segura123',
      name: 'Usuario Nuevo',
      role: 'admin',
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateStatusSchema', () => {
  test('accepts known statuses', () => {
    for (const status of ['confirmada', 'cancelada', 'completada', 'no_asiste', 'reagendada']) {
      expect(UpdateStatusSchema.safeParse({ status }).success).toBe(true)
    }
  })

  test('rejects unknown statuses', () => {
    expect(UpdateStatusSchema.safeParse({ status: 'pendiente' }).success).toBe(false)
  })
})
