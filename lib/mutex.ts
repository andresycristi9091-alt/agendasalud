// Mutex en memoria para prevenir doble-booking en el mismo proceso.
// Para deploys multi-instancia, reemplazar con un lock distribuido (ej: Upstash Redis SET NX).
const locks = new Map<string, number>()

const LOCK_TTL_MS = 30_000

export function acquireLock(key: string): boolean {
  const now = Date.now()
  const expiry = locks.get(key)
  if (expiry !== undefined && expiry > now) return false
  locks.set(key, now + LOCK_TTL_MS)
  return true
}

export function releaseLock(key: string): void {
  locks.delete(key)
}

export function bookingLockKey(professionalId: string, date: string, startTime: string): string {
  return `booking:${professionalId}:${date}:${startTime}`
}
