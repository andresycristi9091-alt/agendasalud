import { NextResponse } from 'next/server'
import { setLocalAdminSession } from '@/lib/auth/local-admin-session'
import { getManagedUserByEmail } from '@/lib/google/sheets'
import { verifyPassword } from '@/lib/auth/password'
import { setLocalUserSession } from '@/lib/auth/local-admin-session'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { isPrimaryAdminEmail } from '@/lib/auth/admin'

const ADMIN_EMAIL = 'admin@agendasalud.cl'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  const limit = rateLimit(req, `admin-login:${email || 'anonimo'}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  })

  if (!limit.allowed) {
    return rateLimitResponse(limit, 'Demasiados intentos de acceso. Espera unos minutos e intenta nuevamente.')
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 })
  }

  // Acceso hardcodeado para el admin principal (funciona sin variables de entorno)
  if (['admin', ADMIN_EMAIL].includes(email) && password === 'admin') {
    const response = NextResponse.json({ ok: true, role: 'admin' })
    await setLocalAdminSession(response)
    return response
  }

  // Fallback: buscar en usuarios gestionados de Sheets
  try {
    const user = await getManagedUserByEmail(email)
    if (user && verifyPassword(password, user.passwordHash)) {
      if (isPrimaryAdminEmail(user.email)) {
        const response = NextResponse.json({ ok: true, role: 'admin' })
        await setLocalAdminSession(response)
        return response
      }
      const centerId = user.centerId || process.env.DEFAULT_CENTER_ID || 'center-neuroplus'
      const response = NextResponse.json({ ok: true, role: 'user' })
      await setLocalUserSession(response, { email: user.email, name: user.name, role: 'user', centerId })
      return response
    }
  } catch {
    // Sheets no disponible — continuar con error generico
  }

  return NextResponse.json({ error: 'Correo o contrasena incorrectos' }, { status: 401 })
}
