import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  RESET_TOKEN_TTL_MINUTES,
  buildResetUrl,
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
} from '@/lib/auth/password-reset'
import { sendPasswordResetEmail } from '@/lib/email'
import {
  createPasswordReset,
  getManagedUserByEmail,
  invalidatePasswordResets,
} from '@/lib/google/sheets'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const GENERIC_MESSAGE =
  'Si el correo existe en AgendaSalud, enviaremos instrucciones para restablecer la contrasena.'

export async function POST(req: Request) {
  const limit = rateLimit(req, 'password-reset-request', {
    limit: 3,
    windowMs: 15 * 60 * 1000,
  })
  if (!limit.allowed) {
    return rateLimitResponse(limit, 'Demasiadas solicitudes. Espera unos minutos e intenta nuevamente.')
  }

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Ingresa un correo valido.' }, { status: 400 })
  }

  try {
    const user = await getManagedUserByEmail(email)

    if (user) {
      const token = generateResetToken()
      const now = new Date()

      await invalidatePasswordResets(email)
      await createPasswordReset({
        id: uuidv4(),
        email: user.email,
        tokenHash: hashResetToken(token),
        expiresAt: resetTokenExpiry(now),
        usedAt: '',
      })

      await sendPasswordResetEmail({
        name: user.name,
        email: user.email,
        resetUrl: buildResetUrl(token),
        ttlMinutes: RESET_TOKEN_TTL_MINUTES,
      })
    }
  } catch (error) {
    // Respuesta generica igual: no revelar si el correo existe ni el estado interno
    console.error('[password-reset] Error procesando solicitud:', error)
  }

  return NextResponse.json({ message: GENERIC_MESSAGE })
}
