import { NextResponse } from 'next/server'
import { getManagedUserByEmail } from '@/lib/google/sheets'
import { verifyPassword } from '@/lib/auth/password'
import { setLocalUserSession } from '@/lib/auth/local-admin-session'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  if (!email || !password) {
    return NextResponse.json({ error: 'Credenciales incompletas' }, { status: 400 })
  }

  const user = await getManagedUserByEmail(email)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Correo o contrasena incorrectos' }, { status: 401 })
  }

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      centerId: user.centerId,
    },
  })
  await setLocalUserSession(response, {
    email: user.email,
    name: user.name,
    role: user.role,
    centerId: user.centerId,
  })

  return response
}
