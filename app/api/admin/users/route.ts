import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, requireAdmin } from '@/lib/auth/admin'
import { AdminUserCreateSchema } from '@/lib/validation'

export async function GET() {
  try {
    await requireAdmin()
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })

    if (error) throw error

    return NextResponse.json({
      users: data.users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name ?? '',
        role: user.user_metadata?.role ?? 'user',
        centerId: user.user_metadata?.centerId ?? '',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos listar usuarios'
    return NextResponse.json({ error: message }, { status: message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 501 : 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json()
    const parsed = AdminUserCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        name: parsed.data.name,
        role: parsed.data.role,
        centerId: parsed.data.centerId,
      },
    })

    if (error) throw error

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? '',
        role: data.user.user_metadata?.role ?? 'user',
        centerId: data.user.user_metadata?.centerId ?? '',
      },
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos crear usuario'
    return NextResponse.json({ error: message }, { status: message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 501 : 500 })
  }
}
