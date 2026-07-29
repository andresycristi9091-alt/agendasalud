import { appendAuditLog } from './google/sheets'

export type AuditEntityType =
  | 'user'
  | 'professional'
  | 'center'
  | 'availability'
  | 'availability_exception'
  | 'appointment'
  | 'session'

export type AuditEvent = {
  actorEmail: string
  actorRole: string
  action: string
  entityType: AuditEntityType
  entityId: string
  details?: Record<string, unknown>
  ip?: string
}

const SENSITIVE_KEY_PATTERN = /password|token|secret|hash/i
const EMAIL_KEY_PATTERN = /email/i
const MAX_DETAIL_LENGTH = 500

export function maskEmail(email: string): string {
  const [local, domain] = String(email).split('@')
  if (!local || !domain) return '***'
  return `${local.slice(0, 1)}***@${domain}`
}

export function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue
    if (EMAIL_KEY_PATTERN.test(key) && typeof value === 'string' && value.includes('@')) {
      sanitized[key] = maskEmail(value)
      continue
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    }
  }

  return sanitized
}

export function serializeAuditDetails(details: Record<string, unknown> | undefined): string {
  if (!details) return ''
  const serialized = JSON.stringify(sanitizeAuditDetails(details))
  return serialized.length > MAX_DETAIL_LENGTH
    ? `${serialized.slice(0, MAX_DETAIL_LENGTH - 3)}...`
    : serialized
}

export function getRequestIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || ''
}

// Fire and forget: la auditoria nunca debe bloquear ni hacer fallar la
// operacion principal. Los errores solo se registran en consola.
export function logAuditEvent(event: AuditEvent): void {
  appendAuditLog({
    actorEmail: event.actorEmail,
    actorRole: event.actorRole,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    details: serializeAuditDetails(event.details),
    ip: event.ip ?? '',
  }).catch((error) => {
    console.warn('[audit] No se pudo registrar el evento:', error)
  })
}
