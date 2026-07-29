import { afterEach, describe, expect, test, vi } from 'vitest'
import { hashResetToken } from '@/lib/auth/password-reset'

vi.mock('@/lib/google/sheets', () => ({
  getManagedUserByEmail: vi.fn(),
  createPasswordReset: vi.fn(),
  invalidatePasswordResets: vi.fn(),
  getPasswordResetByTokenHash: vi.fn(),
  markPasswordResetUsed: vi.fn(),
  updateManagedUser: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn(),
}))

vi.mock('@/lib/auth/admin', () => ({
  createAdminSupabaseClient: vi.fn(),
}))

import { POST as requestReset } from '@/app/api/auth/password-reset/request/route'
import { POST as confirmReset } from '@/app/api/auth/password-reset/confirm/route'
import { sendPasswordResetEmail } from '@/lib/email'
import {
  createPasswordReset,
  getManagedUserByEmail,
  getPasswordResetByTokenHash,
  invalidatePasswordResets,
  markPasswordResetUsed,
  updateManagedUser,
} from '@/lib/google/sheets'

const managedUser = {
  id: 'user-1',
  email: 'pro@agendasalud.cl',
  name: 'Profesional Uno',
  passwordHash: 'pbkdf2$salt:hash',
  role: 'professional',
  centerId: 'center-neuroplus',
  active: true,
  createdAt: '',
  updatedAt: '',
}

let ipCounter = 0

function makeRequest(url: string, body: unknown): Request {
  ipCounter += 1
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.0.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/password-reset/request', () => {
  test('returns generic message and sends email for existing user', async () => {
    vi.mocked(getManagedUserByEmail).mockResolvedValue(managedUser as never)

    const response = await requestReset(
      makeRequest('http://localhost/api/auth/password-reset/request', { email: 'pro@agendasalud.cl' })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('Si el correo existe')
    expect(invalidatePasswordResets).toHaveBeenCalledWith('pro@agendasalud.cl')
    expect(createPasswordReset).toHaveBeenCalledTimes(1)
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1)
  })

  test('stores only the token hash; the email link carries the raw token', async () => {
    vi.mocked(getManagedUserByEmail).mockResolvedValue(managedUser as never)

    await requestReset(
      makeRequest('http://localhost/api/auth/password-reset/request', { email: 'pro@agendasalud.cl' })
    )

    const stored = vi.mocked(createPasswordReset).mock.calls[0][0]
    const emailed = vi.mocked(sendPasswordResetEmail).mock.calls[0][0]
    const rawToken = new URL(emailed.resetUrl).searchParams.get('token') ?? ''

    expect(rawToken).toMatch(/^[0-9a-f]{64}$/)
    expect(stored.tokenHash).not.toBe(rawToken)
    expect(stored.tokenHash).toBe(hashResetToken(rawToken))
  })

  test('returns the same generic message when the user does not exist', async () => {
    vi.mocked(getManagedUserByEmail).mockResolvedValue(null)

    const response = await requestReset(
      makeRequest('http://localhost/api/auth/password-reset/request', { email: 'nadie@correo.cl' })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('Si el correo existe')
    expect(createPasswordReset).not.toHaveBeenCalled()
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  test('rejects malformed emails', async () => {
    const response = await requestReset(
      makeRequest('http://localhost/api/auth/password-reset/request', { email: 'no-es-correo' })
    )

    expect(response.status).toBe(400)
  })

  test('rate limits repeated requests from the same IP', async () => {
    vi.mocked(getManagedUserByEmail).mockResolvedValue(null)

    const fixedIpRequest = () =>
      new Request('http://localhost/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '99.99.99.99' },
        body: JSON.stringify({ email: 'alguien@correo.cl' }),
      })

    const statuses: number[] = []
    for (let i = 0; i < 4; i += 1) {
      const response = await requestReset(fixedIpRequest())
      statuses.push(response.status)
    }

    expect(statuses.slice(0, 3)).toEqual([200, 200, 200])
    expect(statuses[3]).toBe(429)
  })
})

describe('POST /api/auth/password-reset/confirm', () => {
  const rawToken = 'a'.repeat(64)

  function validRecord() {
    return {
      id: 'reset-1',
      email: 'pro@agendasalud.cl',
      tokenHash: hashResetToken(rawToken),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      usedAt: '',
      createdAt: '',
    }
  }

  test('updates the password and marks the token as used', async () => {
    vi.mocked(getPasswordResetByTokenHash).mockResolvedValue(validRecord() as never)
    vi.mocked(getManagedUserByEmail).mockResolvedValue(managedUser as never)

    const response = await confirmReset(
      makeRequest('http://localhost/api/auth/password-reset/confirm', {
        token: rawToken,
        password: 'NuevaClave123',
      })
    )

    expect(response.status).toBe(200)
    expect(updateManagedUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ passwordHash: expect.stringMatching(/^pbkdf2\$/) })
    )
    expect(markPasswordResetUsed).toHaveBeenCalledWith('reset-1')
  })

  test('rejects weak passwords', async () => {
    const response = await confirmReset(
      makeRequest('http://localhost/api/auth/password-reset/confirm', {
        token: rawToken,
        password: 'corta',
      })
    )

    expect(response.status).toBe(400)
    expect(updateManagedUser).not.toHaveBeenCalled()
  })

  test('rejects unknown tokens', async () => {
    vi.mocked(getPasswordResetByTokenHash).mockResolvedValue(null)

    const response = await confirmReset(
      makeRequest('http://localhost/api/auth/password-reset/confirm', {
        token: rawToken,
        password: 'NuevaClave123',
      })
    )

    expect(response.status).toBe(400)
    expect(updateManagedUser).not.toHaveBeenCalled()
  })

  test('rejects expired tokens', async () => {
    vi.mocked(getPasswordResetByTokenHash).mockResolvedValue({
      ...validRecord(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    } as never)

    const response = await confirmReset(
      makeRequest('http://localhost/api/auth/password-reset/confirm', {
        token: rawToken,
        password: 'NuevaClave123',
      })
    )

    expect(response.status).toBe(400)
    expect(updateManagedUser).not.toHaveBeenCalled()
  })

  test('rejects already used tokens', async () => {
    vi.mocked(getPasswordResetByTokenHash).mockResolvedValue({
      ...validRecord(),
      usedAt: new Date().toISOString(),
    } as never)

    const response = await confirmReset(
      makeRequest('http://localhost/api/auth/password-reset/confirm', {
        token: rawToken,
        password: 'NuevaClave123',
      })
    )

    expect(response.status).toBe(400)
    expect(updateManagedUser).not.toHaveBeenCalled()
  })
})
