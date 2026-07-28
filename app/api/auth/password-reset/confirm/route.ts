import { NextResponse } from 'next/server'
import { evaluateResetRecord, hashResetToken } from '@/lib/auth/password-reset'
import { hashPassword } from '@/lib/auth/password'
import { createAdminSupabaseClient } from '@/lib/auth/admin'
import {
  getManagedUserByEmail,
  getPasswordResetByTokenHash,
  markPasswordResetUsed,
  updateManagedUser,
} from '@/lib/google/sheets'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { StrongPasswordSchema } from '@/lib/validation'

const INVALID_TOKEN_MESSAGE =
  'El enlace de recuperacion no es valido o ya expiro. Solicita uno nuevo.'

export async function POST(req: Request) {
  const limit = rateLimit(req, 'password-reset-confirm', {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (!limit.allowed) {
    return rateLimitResponse(limit, 'Demasiados intentos. Espera unos minutos e intenta nuevamente.')
  }

  const body = await req.json().catch(() => ({}))
  const token = String(body.token ?? '').trim()
  const password = String(body.password ?? '')

  if (!token) {
    return NextResponse.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 })
  }

  const passwordCheck = StrongPasswordSchema.safeParse(password)
  if (!passwordCheck.success) {
    const message = passwordCheck.error.issues[0]?.message ?? 'Contrasena invalida.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const tokenHash = hashResetToken(token)
  const record = await getPasswordResetByTokenHash(tokenHash)
  const evaluation = evaluateResetRecord(record, tokenHash, new Date())

  if (!evaluation.valid || !record) {
    return NextResponse.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 })
  }

  const user = await getManagedUserByEmail(record.email)
  if (!user) {
    return NextResponse.json({ error: INVALID_TOKEN_MESSAGE }, { status: 400 })
  }

  await updateManagedUser(user.id, { passwordHash: hashPassword(password) })
  await markPasswordResetUsed(record.id)

  // Sincronizacion best effort con Supabase si hay cuenta equivalente
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createAdminSupabaseClient()
      const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
      const supabaseUser = data?.users?.find(
        (item) => item.email?.toLowerCase() === user.email.toLowerCase()
      )
      if (supabaseUser) {
        await supabase.auth.admin.updateUserById(supabaseUser.id, { password })
      }
    } catch (error) {
      console.warn('[password-reset] No se pudo sincronizar Supabase:', error)
    }
  }

  return NextResponse.json({ message: 'Contrasena actualizada. Ya puedes iniciar sesion.' })
}
