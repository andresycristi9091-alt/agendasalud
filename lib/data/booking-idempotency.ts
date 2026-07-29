import { createHash } from 'node:crypto'

// Invariante I-04 del blueprint: reintentar la misma reserva no crea una
// segunda cita. La clave viene del header Idempotency-Key del cliente; si
// falta, se deriva del contenido de la solicitud para que el mismo intento
// (mismo paciente, profesional y horario) siempre caiga en la misma clave.

export type BookingIdentity = {
  professionalId: string
  date: string
  startTime: string
  endTime: string
  patientEmail: string
}

export function bookingRequestHash(identity: BookingIdentity): string {
  const canonical = [
    identity.professionalId.trim(),
    identity.date.trim(),
    identity.startTime.trim(),
    identity.endTime.trim(),
    identity.patientEmail.trim().toLowerCase(),
  ].join('|')
  return createHash('sha256').update(canonical).digest('hex')
}

export function resolveIdempotencyKey(
  headerValue: string | null | undefined,
  identity: BookingIdentity
): string {
  const fromHeader = String(headerValue ?? '').trim()
  if (fromHeader) {
    // Normalizar y acotar para usarla como PK sin sorpresas
    return fromHeader.slice(0, 120)
  }
  return `derived-${bookingRequestHash(identity)}`
}
