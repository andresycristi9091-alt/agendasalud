import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { User } from '@supabase/supabase-js'
import { createAdminSupabaseClient, requireAdmin } from '@/lib/auth/admin'
import { AdminUserCreateSchema } from '@/lib/validation'
import { createManagedUser, getManagedUsers } from '@/lib/google/sheets'
import { hashPassword } from '@/lib/auth/password'

type AdminUserPayload = {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  centerId: string
  active: boolean
  createdAt?: string
  lastSignInAt?: string | null
  source: 'AgendaSalud' | 'Supabase'
}

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

function mapManagedUser(user: Awaited<ReturnType<typeof getManagedUsers>>[number]): AdminUserPayload {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    centerId: user.centerId,
    active: user.active,
    createdAt: user.createdAt,
    source: 'AgendaSalud',
  }
}

function mapSupabaseUser(user: User): AdminUserPayload {
  return {
    id: user.id,
    email: user.email ?? '',
    name: resolveSupabaseName(user),
    role: user.user_metadata?.role === 'admin' ? 'admin' : 'user',
    centerId: user.user_metadata?.centerId ?? '',
    active: !user.banned_until,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    source: 'Supabase',
  }
}

export async function GET() {
  try {
    await requireAdmin()

    const managedUsers = await getManagedUsers()
    const users: AdminUserPayload[] = managedUsers.map(mapManagedUser)

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createAdminSupabaseClient()
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })

      if (error) throw error

      const managedEmails = new Set(managedUsers.map((user) => user.email.toLowerCase()))
      users.push(
        ...data.users
          .filter((user) => user.email && !managedEmails.has(user.email.toLowerCase()))
          .map(mapSupabaseUser)
      )
    }

    return NextResponse.json({ users })
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

    const existing = await getManagedUsers()
    const email = parsed.data.email.toLowerCase()
    if (existing.some((user) => user.email.toLowerCase() === email)) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese correo. Editalo o reactivalo desde la lista.' }, { status: 409 })
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

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createAdminSupabaseClient()
      const { error } = await supabase.auth.admin.createUser({
        email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: {
          name: parsed.data.name,
          role: parsed.data.role,
          centerId,
        },
      })

      if (error && !error.message.toLowerCase().includes('already')) {
        console.warn('[admin users] No se pudo sincronizar usuario en Supabase:', error.message)
      }
    }

    return NextResponse.json({
      user: mapManagedUser(user),
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos crear usuario'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
