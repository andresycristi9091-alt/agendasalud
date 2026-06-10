import { createHash } from 'node:crypto'

function getSalt() {
  return process.env.ADMIN_SESSION_SECRET || process.env.GOOGLE_PRIVATE_KEY || 'agendasalud-local-users'
}

export function hashPassword(password: string) {
  return createHash('sha256').update(`${getSalt()}:${password}`).digest('hex')
}

export function verifyPassword(password: string, hash: string) {
  return hashPassword(password) === hash
}
