import { createHash, randomBytes } from 'node:crypto'

export const RESET_TOKEN_TTL_MINUTES = 45

export type ResetTokenEvaluation =
  | { valid: true }
  | { valid: false; reason: 'used' | 'expired' | 'not_found' }

export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function resetTokenExpiry(now: Date): string {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000).toISOString()
}

export function evaluateResetRecord(
  record: { tokenHash: string; expiresAt: string; usedAt: string } | null,
  tokenHash: string,
  now: Date
): ResetTokenEvaluation {
  if (!record || record.tokenHash !== tokenHash) {
    return { valid: false, reason: 'not_found' }
  }
  if (record.usedAt) {
    return { valid: false, reason: 'used' }
  }
  const expiresAt = new Date(record.expiresAt).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    return { valid: false, reason: 'expired' }
  }
  return { valid: true }
}

export function buildResetUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agendasalud.vercel.app'
  return `${base.replace(/\/$/, '')}/restablecer-contrasena?token=${token}`
}
