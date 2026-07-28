import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

function makeRequest(ip: string): Request {
  return new Request('http://localhost/api/test', {
    headers: { 'x-forwarded-for': ip },
  })
}

let actionCounter = 0

function uniqueAction(): string {
  actionCounter += 1
  return `test-action-${actionCounter}`
}

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('allows requests below the limit', () => {
    const action = uniqueAction()
    const options = { limit: 3, windowMs: 60_000 }

    const first = rateLimit(makeRequest('1.1.1.1'), action, options)
    const second = rateLimit(makeRequest('1.1.1.1'), action, options)

    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(2)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(1)
  })

  test('blocks requests over the limit with retryAfter', () => {
    const action = uniqueAction()
    const options = { limit: 2, windowMs: 60_000 }

    rateLimit(makeRequest('2.2.2.2'), action, options)
    rateLimit(makeRequest('2.2.2.2'), action, options)
    const blocked = rateLimit(makeRequest('2.2.2.2'), action, options)

    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  test('resets the bucket after the window expires', () => {
    const action = uniqueAction()
    const options = { limit: 1, windowMs: 60_000 }

    rateLimit(makeRequest('3.3.3.3'), action, options)
    expect(rateLimit(makeRequest('3.3.3.3'), action, options).allowed).toBe(false)

    vi.advanceTimersByTime(61_000)

    expect(rateLimit(makeRequest('3.3.3.3'), action, options).allowed).toBe(true)
  })

  test('tracks different IPs independently', () => {
    const action = uniqueAction()
    const options = { limit: 1, windowMs: 60_000 }

    expect(rateLimit(makeRequest('4.4.4.4'), action, options).allowed).toBe(true)
    expect(rateLimit(makeRequest('5.5.5.5'), action, options).allowed).toBe(true)
    expect(rateLimit(makeRequest('4.4.4.4'), action, options).allowed).toBe(false)
  })

  test('handles requests without IP headers using a shared bucket', () => {
    const action = uniqueAction()
    const options = { limit: 1, windowMs: 60_000 }
    const anonymous = new Request('http://localhost/api/test')

    expect(rateLimit(anonymous, action, options).allowed).toBe(true)
    expect(rateLimit(anonymous, action, options).allowed).toBe(false)
  })
})

describe('rateLimitResponse', () => {
  test('returns 429 with rate limit headers', async () => {
    const response = rateLimitResponse(
      { allowed: false, limit: 5, remaining: 0, resetAt: Date.now() + 30_000, retryAfter: 30 },
      'Demasiados intentos'
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('30')
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5')

    const body = await response.json()
    expect(body.error).toBe('Demasiados intentos')
    expect(body.retryAfter).toBe(30)
  })
})
