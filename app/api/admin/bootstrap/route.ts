import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/auth/admin'
import { setLocalAdminSession } from '@/lib/auth/local-admin-session'
import { hashPassword } from '@/lib/auth/password'

const ADMIN_EMAIL = 'admin@agendasalud.cl'

export async function POST(req: Request) {
  // Requiere BOOTSTRAP_SECRET para evitar ejecucion no autorizada
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET
  if (!bootstrapSecret) {
    return NextResponse.json(
      { error: 'Bootstrap deshabilitado en este ambiente. Configura BOOTSTRAP_SECRET.' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const authHeader = req.headers.get('authorization') ?? ''
    const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : body.bootstrapSecret

    if (providedSecret !== bootstrapSecret) {
      return NextResponse.json({ error: 'Secreto de bootstrap invalido' }, { status: 401 })
    }

    const newPassword = body.password
    if (!newPassword || String(newPassword).length < 12) {
      return NextResponse.json(
        { error: 'La contrasena debe tener al menos 12 caracteres' },
        { status: 400 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const response = NextResponse.json({ email: ADMIN_EMAIL, fallbackSession: true })
      await setLocalAdminSession(response)
      return response
    }

    const supabase = createAdminSupabaseClient()
    const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
    const adminUser = existing.users.find((user) => user.email === ADMIN_EMAIL)

    const passwordHash = hashPassword(newPassword)

    if (adminUser) {
      await supabase.auth.admin.updateUserById(adminUser.id, {
        password: newPassword,
        user_metadata: {
          name: 'Administrador AgendaSalud',
          role: 'admin',
          centerId: '',
          passwordHash,
        },
      })
      return NextResponse.json({ email: ADMIN_EMAIL, updated: true })
    }

    const { error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Administrador AgendaSalud',
        role: 'admin',
        centerId: '',
        passwordHash,
      },
    })

    if (error) throw error
    return NextResponse.json({ email: ADMIN_EMAIL, created: true }, { status: 201 })
  } catch (error) {
    console.error('[bootstrap] error:', error)
    return NextResponse.json(
      { error: 'No pudimos preparar el usuario admin' },
      { status: 500 }
    )
  }
}
