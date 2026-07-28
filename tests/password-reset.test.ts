import { afterEach, describe, expect, test } from 'vitest'
import {
  RESET_TOKEN_TTL_MINUTES,
  buildResetUrl,
  evaluateResetRecord,
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
} from '@/lib/auth/password-reset'

const NOW = new Date('2026-07-28T12:00:00Z')

function makeRecord(overrides?: Partial<{ tokenHash: string; expiresAt: string; usedAt: string }>) {
  return {
    tokenHash: 'hash-abc',
    expiresAt: new Date(NOW.getTime() + 10 * 60_000).toISOString(),
    usedAt: '',
    ...overrides,
  }
}

describe('generateResetToken', () => {
  test('produces 64 hex chars and unique values', () => {
    const a = generateResetToken()
    const b = generateResetToken()

    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })
})

describe('hashResetToken', () => {
  test('is deterministic and does not expose the token', () => {
    const token = generateResetToken()
    const hash = hashResetToken(token)

    expect(hash).toBe(hashResetToken(token))
    expect(hash).not.toContain(token)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('resetTokenExpiry', () => {
  test('returns an ISO date TTL minutes in the future', () => {
    const expiry = new Date(resetTokenExpiry(NOW))
    expect(expiry.getTime() - NOW.getTime()).toBe(RESET_TOKEN_TTL_MINUTES * 60_000)
  })
})

describe('evaluateResetRecord', () => {
  test('accepts a fresh unused record with matching hash', () => {
    expect(evaluateResetRecord(makeRecord(), 'hash-abc', NOW)).toEqual({ valid: true })
  })

  test('rejects a missing record', () => {
    const result = evaluateResetRecord(null, 'hash-abc', NOW)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('not_found')
  })

  test('rejects a hash mismatch', () => {
    const result = evaluateResetRecord(makeRecord(), 'otro-hash', NOW)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('not_found')
  })

  test('rejects an already used record', () => {
    const result = evaluateResetRecord(makeRecord({ usedAt: NOW.toISOString() }), 'hash-abc', NOW)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('used')
  })

  test('rejects an expired record', () => {
    const result = evaluateResetRecord(
      makeRecord({ expiresAt: new Date(NOW.getTime() - 1000).toISOString() }),
      'hash-abc',
      NOW
    )
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('expired')
  })

  test('rejects a record with malformed expiry', () => {
    const result = evaluateResetRecord(makeRecord({ expiresAt: 'no-es-fecha' }), 'hash-abc', NOW)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('expired')
  })
})

describe('buildResetUrl', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  test('uses NEXT_PUBLIC_APP_URL without double slash', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://agendasalud.cl/'
    expect(buildResetUrl('tok123')).toBe('https://agendasalud.cl/restablecer-contrasena?token=tok123')
  })
})
