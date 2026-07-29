import { describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/google/sheets', () => ({
  appendAuditLog: vi.fn(),
}))

import { maskEmail, sanitizeAuditDetails, serializeAuditDetails } from '@/lib/audit'

describe('maskEmail', () => {
  test('keeps first char and domain', () => {
    expect(maskEmail('maria@example.com')).toBe('m***@example.com')
  })

  test('handles malformed values', () => {
    expect(maskEmail('no-es-email')).toBe('***')
    expect(maskEmail('')).toBe('***')
  })
})

describe('sanitizeAuditDetails', () => {
  test('removes sensitive keys', () => {
    const result = sanitizeAuditDetails({
      name: 'Juan',
      password: 'Secreta123',
      passwordHash: 'pbkdf2$abc',
      tokenHash: 'xyz',
      apiSecret: 'shh',
    })

    expect(result).toEqual({ name: 'Juan' })
  })

  test('masks email values', () => {
    const result = sanitizeAuditDetails({ patientEmail: 'paciente@correo.cl' })
    expect(result.patientEmail).toBe('p***@correo.cl')
  })

  test('drops non-primitive values', () => {
    const result = sanitizeAuditDetails({
      nested: { foo: 'bar' },
      list: [1, 2, 3],
      count: 4,
      active: true,
    })

    expect(result).toEqual({ count: 4, active: true })
  })
})

describe('serializeAuditDetails', () => {
  test('returns empty string without details', () => {
    expect(serializeAuditDetails(undefined)).toBe('')
  })

  test('serializes sanitized details as JSON', () => {
    const json = serializeAuditDetails({ role: 'professional', password: 'x' })
    expect(JSON.parse(json)).toEqual({ role: 'professional' })
  })

  test('truncates very long payloads', () => {
    const json = serializeAuditDetails({ reason: 'x'.repeat(1000) })
    expect(json.length).toBeLessThanOrEqual(500)
    expect(json.endsWith('...')).toBe(true)
  })
})
