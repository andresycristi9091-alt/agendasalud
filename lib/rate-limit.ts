import { NextResponse } from 'next/server'

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfter: number
}

const buckets = new Map<string, Bucket>()
let lastCleanupAt = 0

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || 'unknown'
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:@/-]/g, '')
    .slice(0, 180)
}

function cleanupExpired(now: number) {
  if (now - lastCleanupAt < 60_000) return
  lastCleanupAt = now

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export function rateLimit(req: Request, action: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  cleanupExpired(now)

  const ip = getClientIp(req)
  const key = `${normalizeKey(action)}:${normalizeKey(ip)}`
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs
    buckets.set(key, { count: 1, resetAt })

    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      resetAt,
      retryAfter: 0,
    }
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    }
  }

  existing.count += 1

  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(options.limit - existing.count, 0),
    resetAt: existing.resetAt,
    retryAfter: 0,
  }
}

export function rateLimitResponse(result: RateLimitResult, message: string) {
  return NextResponse.json(
    {
      error: message,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    }
  )
}
