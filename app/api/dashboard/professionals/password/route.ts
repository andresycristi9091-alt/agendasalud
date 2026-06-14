import { NextResponse } from 'next/server'
import { getLocalAdminSession } from '@/lib/auth/local-admin-session'
import { getManagedUserByEmail, updateManagedUser } from '@/lib/google/sheets'
import { verifyPassword, hashPassword } from '@/lib/auth/password'

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

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: 'La nueva contrasena debe tener al menos 8 caracteres' }, { status: 400 })
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
