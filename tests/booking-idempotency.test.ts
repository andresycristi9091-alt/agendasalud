import { afterEach, describe, expect, test } from 'vitest'
import {
  bookingRequestHash,
  resolveIdempotencyKey,
  type BookingIdentity,
} from '@/lib/data/booking-idempotency'
import { isPostgresBookingEnabled } from '@/lib/data/appointments'

const identity: BookingIdentity = {
  professionalId: 'prof-1',
  date: '2026-08-03',
  startTime: '10:00',
  endTime: '10:30',
  patientEmail: 'Maria@Example.com',
}

describe('bookingRequestHash', () => {
  test('is deterministic for the same identity', () => {
    expect(bookingRequestHash(identity)).toBe(bookingRequestHash({ ...identity }))
  })

  test('normalizes email casing and whitespace', () => {
    const normalized = bookingRequestHash(identity)
    const messy = bookingRequestHash({
      ...identity,
      patientEmail: '  maria@example.com  ',
    })
    expect(messy).toBe(normalized)
  })

  test('changes when the slot changes', () => {
    expect(bookingRequestHash({ ...identity, startTime: '11:00' })).not.toBe(
      bookingRequestHash(identity)
    )
  })

  test('changes when the patient changes', () => {
    expect(bookingRequestHash({ ...identity, patientEmail: 'otra@example.com' })).not.toBe(
      bookingRequestHash(identity)
    )
  })
})

describe('resolveIdempotencyKey', () => {
  test('prefers the client-provided header', () => {
    expect(resolveIdempotencyKey('mi-clave-123', identity)).toBe('mi-clave-123')
  })

  test('truncates very long header values', () => {
    const long = 'k'.repeat(300)
    expect(resolveIdempotencyKey(long, identity)).toHaveLength(120)
  })

  test('derives a stable key from the payload when the header is missing', () => {
    const derived = resolveIdempotencyKey(null, identity)
    expect(derived).toBe(`derived-${bookingRequestHash(identity)}`)
    expect(resolveIdempotencyKey('', identity)).toBe(derived)
    expect(resolveIdempotencyKey('   ', identity)).toBe(derived)
  })
})

describe('isPostgresBookingEnabled', () => {
  afterEach(() => {
    delete process.env.BOOKING_BACKEND
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  test('disabled by default', () => {
    expect(isPostgresBookingEnabled()).toBe(false)
  })

  test('requires flag plus credentials', () => {
    process.env.BOOKING_BACKEND = 'postgres'
    expect(isPostgresBookingEnabled()).toBe(false)

    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proyecto.supabase.co'
    expect(isPostgresBookingEnabled()).toBe(true)
  })

  test('any other backend value keeps Sheets', () => {
    process.env.BOOKING_BACKEND = 'sheets'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proyecto.supabase.co'
    expect(isPostgresBookingEnabled()).toBe(false)
  })
})
