import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/auth/admin'

const ADMIN_EMAIL = 'admin@neuroplus.local'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    if (body.username !== 'admin' || body.password !== 'admin') {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
    const adminUser = existing.users.find((user) => user.email === ADMIN_EMAIL)

    if (adminUser) {
      await supabase.auth.admin.updateUserById(adminUser.id, {
        password: 'admin',
        user_metadata: {
          name: 'Administrador NeuroPlus',
          role: 'admin',
          centerId: '',
        },
      })
      return NextResponse.json({ email: ADMIN_EMAIL })
    }

    const { error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: 'admin',
      email_confirm: true,
      user_metadata: {
        name: 'Administrador NeuroPlus',
        role: 'admin',
        centerId: '',
      },
    })

    if (error) throw error
    return NextResponse.json({ email: ADMIN_EMAIL }, { status: 201 })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No pudimos preparar el usuario admin',
    }, { status: 500 })
  }
}
