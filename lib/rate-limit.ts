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

// ── Backend Redis (Upstash / Vercel KV via REST) ────────────
// Persistente entre instancias serverless. Se activa solo cuando existen
// las variables de entorno; si falla la red, cae al backend en memoria.
type RedisConfig = {
  url: string
  token: string
}

function getRedisConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ''
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ''
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

async function redisRateLimit(
  config: RedisConfig,
  key: string,
  options: RateLimitOptions,
  now: number
): Promise<RateLimitResult | null> {
  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, options.windowMs, 'NX'],
        ['PTTL', key],
      ]),
    })

    if (!response.ok) return null

    const results = (await response.json()) as Array<{ result?: unknown; error?: string }>
    const count = Number(results?.[0]?.result)
    const ttl = Number(results?.[2]?.result)

    if (!Number.isFinite(count) || count < 1) return null

    const windowTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : options.windowMs
    const resetAt = now + windowTtl

    if (count > options.limit) {
      return {
        allowed: false,
        limit: options.limit,
        remaining: 0,
        resetAt,
        retryAfter: Math.max(Math.ceil(windowTtl / 1000), 1),
      }
    }

    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(options.limit - count, 0),
      resetAt,
      retryAfter: 0,
    }
  } catch (error) {
    console.warn('[rate-limit] Redis no disponible, usando memoria local:', error)
    return null
  }
}

// ── Backend en memoria (fallback y desarrollo local) ────────
function memoryRateLimit(key: string, options: RateLimitOptions, now: number): RateLimitResult {
  cleanupExpired(now)

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

export async function rateLimit(
  req: Request,
  action: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now()
  const ip = getClientIp(req)
  const key = `ratelimit:${normalizeKey(action)}:${normalizeKey(ip)}`

  const redisConfig = getRedisConfig()
  if (redisConfig) {
    const result = await redisRateLimit(redisConfig, key, options, now)
    if (result) return result
  }

  return memoryRateLimit(key, options, now)
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
