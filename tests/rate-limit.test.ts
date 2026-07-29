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

describe('rateLimit (memoria)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('allows requests below the limit', async () => {
    const action = uniqueAction()
    const options = { limit: 3, windowMs: 60_000 }

    const first = await rateLimit(makeRequest('1.1.1.1'), action, options)
    const second = await rateLimit(makeRequest('1.1.1.1'), action, options)

    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(2)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(1)
  })

  test('blocks requests over the limit with retryAfter', async () => {
    const action = uniqueAction()
    const options = { limit: 2, windowMs: 60_000 }

    await rateLimit(makeRequest('2.2.2.2'), action, options)
    await rateLimit(makeRequest('2.2.2.2'), action, options)
    const blocked = await rateLimit(makeRequest('2.2.2.2'), action, options)

    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  test('resets the bucket after the window expires', async () => {
    const action = uniqueAction()
    const options = { limit: 1, windowMs: 60_000 }

    await rateLimit(makeRequest('3.3.3.3'), action, options)
    expect((await rateLimit(makeRequest('3.3.3.3'), action, options)).allowed).toBe(false)

    vi.advanceTimersByTime(61_000)

    expect((await rateLimit(makeRequest('3.3.3.3'), action, options)).allowed).toBe(true)
  })

  test('tracks different IPs independently', async () => {
    const action = uniqueAction()
    const options = { limit: 1, windowMs: 60_000 }

    expect((await rateLimit(makeRequest('4.4.4.4'), action, options)).allowed).toBe(true)
    expect((await rateLimit(makeRequest('5.5.5.5'), action, options)).allowed).toBe(true)
    expect((await rateLimit(makeRequest('4.4.4.4'), action, options)).allowed).toBe(false)
  })

  test('handles requests without IP headers using a shared bucket', async () => {
    const action = uniqueAction()
    const options = { limit: 1, windowMs: 60_000 }
    const anonymous = () => new Request('http://localhost/api/test')

    expect((await rateLimit(anonymous(), action, options)).allowed).toBe(true)
    expect((await rateLimit(anonymous(), action, options)).allowed).toBe(false)
  })
})

describe('rateLimit (Redis/Upstash)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    global.fetch = originalFetch
  })

  function mockPipeline(count: number, ttl: number) {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: count }, { result: 1 }, { result: ttl }],
    })
  }

  test('allows when the Redis counter is below the limit', async () => {
    global.fetch = mockPipeline(2, 30_000) as typeof fetch

    const result = await rateLimit(makeRequest('6.6.6.6'), uniqueAction(), { limit: 5, windowMs: 60_000 })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(3)
  })

  test('blocks when the Redis counter exceeds the limit', async () => {
    global.fetch = mockPipeline(6, 30_000) as typeof fetch

    const result = await rateLimit(makeRequest('6.6.6.6'), uniqueAction(), { limit: 5, windowMs: 60_000 })

    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBe(30)
  })

  test('sends the pipeline with INCR, PEXPIRE NX and PTTL', async () => {
    const fetchMock = mockPipeline(1, 60_000)
    global.fetch = fetchMock as typeof fetch

    await rateLimit(makeRequest('7.7.7.7'), 'redis-shape', { limit: 5, windowMs: 60_000 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://fake-redis.upstash.io/pipeline')
    const commands = JSON.parse(init.body)
    expect(commands[0][0]).toBe('INCR')
    expect(commands[1][0]).toBe('PEXPIRE')
    expect(commands[1][3]).toBe('NX')
    expect(commands[2][0]).toBe('PTTL')
  })

  test('falls back to memory when Redis fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as typeof fetch

    const action = uniqueAction()
    const options = { limit: 1, windowMs: 60_000 }

    expect((await rateLimit(makeRequest('8.8.8.8'), action, options)).allowed).toBe(true)
    expect((await rateLimit(makeRequest('8.8.8.8'), action, options)).allowed).toBe(false)
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
