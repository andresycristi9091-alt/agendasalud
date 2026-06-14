import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { User } from '@supabase/supabase-js'
import { createAdminSupabaseClient, requireAdmin } from '@/lib/auth/admin'
import { AdminUserCreateSchema } from '@/lib/validation'
import { createManagedUser, getManagedUsers } from '@/lib/google/sheets'
import { hashPassword } from '@/lib/auth/password'

function resolveSupabaseName(user: User): string {
  const meta = user.user_metadata ?? {}
  const candidates = [
    meta.name,
    meta.full_name,
    meta.display_name,
    user.identities?.[0]?.identity_data?.name,
    user.identities?.[0]?.identity_data?.full_name,
  ]
  return candidates.find((v) => typeof v === 'string' && v.trim().length > 0) ?? ''
}

export async function GET() {
  try {
    await requireAdmin()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const users = await getManagedUsers()
      return NextResponse.json({
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          centerId: user.centerId,
          active: user.active,
          createdAt: user.createdAt,
          source: 'AgendaSalud',
        })),
      })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })

    if (error) throw error

    return NextResponse.json({
      users: data.users.map((user) => ({
        id: user.id,
        email: user.email,
        name: resolveSupabaseName(user),
        role: user.user_metadata?.role ?? 'user',
        centerId: user.user_metadata?.centerId ?? '',
        active: !user.banned_until,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        source: 'Supabase',
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos listar usuarios'
    return NextResponse.json({ error: message }, { status: 500 })
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

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const existing = await getManagedUsers()
      const email = parsed.data.email.toLowerCase()
      if (existing.some((user) => user.email.toLowerCase() === email && user.active)) {
        return NextResponse.json({ error: 'Ya existe un usuario activo con ese correo.' }, { status: 409 })
      }

      const centerId = parsed.data.centerId || (parsed.data.role === 'user' ? (process.env.DEFAULT_CENTER_ID || 'center-neuroplus') : '')

      const user = await createManagedUser({
        id: uuidv4(),
        email,
        name: parsed.data.name,
        passwordHash: hashPassword(parsed.data.password),
        role: parsed.data.role,
        centerId,
        active: true,
      })

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          centerId: user.centerId,
          active: user.active,
          source: 'AgendaSalud',
        },
      }, { status: 201 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        name: parsed.data.name,
        role: parsed.data.role,
        centerId: parsed.data.centerId || (parsed.data.role === 'user' ? (process.env.DEFAULT_CENTER_ID || 'center-neuroplus') : ''),
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
        active: !data.user.banned_until,
        source: 'Supabase',
      },
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos crear usuario'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
