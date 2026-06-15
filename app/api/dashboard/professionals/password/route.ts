import { NextResponse } from 'next/server'
import { getLocalAdminSession } from '@/lib/auth/local-admin-session'
import { getManagedUserByEmail, updateManagedUser } from '@/lib/google/sheets'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { StrongPasswordSchema } from '@/lib/validation'

export async function PATCH(req: Request) {
  const session = await getLocalAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida' }, { status: 400 })
  }

  const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string }

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const limit = rateLimit(req, `password-change:${session.email}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })

  if (!limit.allowed) {
    return rateLimitResponse(limit, 'Demasiados intentos de cambio de contrasena. Espera unos minutos.')
  }

  const parsedPassword = StrongPasswordSchema.safeParse(newPassword)
  if (!parsedPassword.success) {
    return NextResponse.json({ error: parsedPassword.error.issues[0]?.message ?? 'La nueva contrasena no cumple la politica de seguridad' }, { status: 400 })
  }

  const user = await getManagedUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: 'La clave actual es incorrecta' }, { status: 400 })
  }

  await updateManagedUser(user.id, { passwordHash: hashPassword(newPassword) })

  return NextResponse.json({ ok: true })
}
