import { NextResponse } from 'next/server'
import { getManagedUserByEmail } from '@/lib/google/sheets'
import { verifyPassword } from '@/lib/auth/password'
import { setLocalUserSession } from '@/lib/auth/local-admin-session'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  const limit = rateLimit(req, `professional-login:${email || 'anonimo'}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  })

  if (!limit.allowed) {
    return rateLimitResponse(limit, 'Demasiados intentos de acceso. Espera unos minutos e intenta nuevamente.')
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 })
  }

  const user = await getManagedUserByEmail(email)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Correo o contrasena incorrectos' }, { status: 401 })
  }

  const centerId = user.centerId || process.env.DEFAULT_CENTER_ID || 'center-neuroplus'

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      centerId,
    },
  })
  await setLocalUserSession(response, {
    email: user.email,
    name: user.name,
    role: user.role,
    centerId,
  })

  return response
}
