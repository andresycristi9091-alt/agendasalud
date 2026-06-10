import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto'

const ITERATIONS = 100_000
const KEYLEN = 64
const DIGEST = 'sha512'
const PREFIX = 'pbkdf2$'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex')
  return `${PREFIX}${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith(PREFIX)) {
    const rest = stored.slice(PREFIX.length)
    const colonIdx = rest.indexOf(':')
    if (colonIdx === -1) return false
    const salt = rest.slice(0, colonIdx)
    const storedHash = rest.slice(colonIdx + 1)
    const check = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex')
    return timingSafeEqual(check, storedHash)
  }
  // Compatibilidad con hashes SHA-256 existentes; se migran la proxima vez que el usuario guarda contrasena
  const legacySalt = process.env.ADMIN_SESSION_SECRET || 'agendasalud-local-users'
  const legacy = createHash('sha256').update(`${legacySalt}:${password}`).digest('hex')
  return timingSafeEqual(legacy, stored)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}
