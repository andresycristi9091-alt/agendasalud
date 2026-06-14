import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, requireAdmin } from '@/lib/auth/admin'
import { AdminUserUpdateSchema } from '@/lib/validation'
import { hashPassword } from '@/lib/auth/password'
import { deleteManagedUser, getManagedUsers, updateManagedUser } from '@/lib/google/sheets'

async function findSupabaseUserByEmail(email: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (error) return null
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function syncSupabaseUserByEmail(
  originalEmail: string,
  payload: {
    email?: string
    password?: string
    ban_duration?: string
    user_metadata?: { role?: string; name?: string; centerId?: string }
  }
) {
  const supabaseUser = await findSupabaseUserByEmail(originalEmail)
  if (!supabaseUser) return

  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.auth.admin.updateUserById(supabaseUser.id, payload)
  if (error) {
    console.warn('[admin users] No se pudo sincronizar usuario en Supabase:', error.message)
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const parsed = AdminUserUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const users = await getManagedUsers()
    const managedUser = users.find((user) => user.id === id)

    if (managedUser) {
      if (parsed.data.email) {
        const duplicate = users.some((user) =>
          user.id !== id &&
          user.email.toLowerCase() === parsed.data.email!.toLowerCase()
        )
        if (duplicate) {
          return NextResponse.json({ error: 'Ya existe otro usuario con ese correo.' }, { status: 409 })
        }
      }

      const updated = await updateManagedUser(id, {
        email: parsed.data.email?.toLowerCase(),
        name: parsed.data.name,
        role: parsed.data.role,
        centerId: parsed.data.centerId,
        active: parsed.data.active,
        ...(parsed.data.password ? { passwordHash: hashPassword(parsed.data.password) } : {}),
      })

      await syncSupabaseUserByEmail(managedUser.email, {
        ...(parsed.data.email ? { email: parsed.data.email.toLowerCase() } : {}),
        ...(parsed.data.password ? { password: parsed.data.password } : {}),
        user_metadata: {
          ...(parsed.data.role ? { role: parsed.data.role } : {}),
          ...(parsed.data.name ? { name: parsed.data.name } : {}),
          ...(parsed.data.centerId !== undefined ? { centerId: parsed.data.centerId } : {}),
        },
        ...(parsed.data.active === false ? { ban_duration: '876000h' } : {}),
        ...(parsed.data.active === true ? { ban_duration: 'none' } : {}),
      })

      return NextResponse.json({
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          centerId: updated.centerId,
          active: updated.active,
          source: 'AgendaSalud',
        },
      })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const supabase = createAdminSupabaseClient()
    const payload: {
      email?: string
      password?: string
      ban_duration?: string
      user_metadata?: { role?: string; name?: string; centerId?: string }
    } = {
      user_metadata: {},
    }

    if (parsed.data.email) payload.email = parsed.data.email.toLowerCase()
    if (parsed.data.password) payload.password = parsed.data.password
    if (parsed.data.role) payload.user_metadata!.role = parsed.data.role
    if (parsed.data.name) payload.user_metadata!.name = parsed.data.name
    if (parsed.data.centerId !== undefined) payload.user_metadata!.centerId = parsed.data.centerId
    if (parsed.data.active === false) payload.ban_duration = '876000h'
    if (parsed.data.active === true) payload.ban_duration = 'none'

    const { data, error } = await supabase.auth.admin.updateUserById(id, payload)
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
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos actualizar usuario'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const hardDelete = new URL(req.url).searchParams.get('hard') === 'true'

    const users = await getManagedUsers()
    const managedUser = users.find((user) => user.id === id)

    if (managedUser) {
      if (hardDelete) {
        await deleteManagedUser(id)
      } else {
        await updateManagedUser(id, { active: false })
      }

      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseUser = await findSupabaseUserByEmail(managedUser.email)
        if (supabaseUser) {
          const supabase = createAdminSupabaseClient()
          const { error } = hardDelete
            ? await supabase.auth.admin.deleteUser(supabaseUser.id)
            : await supabase.auth.admin.updateUserById(supabaseUser.id, { ban_duration: '876000h' })
          if (error) console.warn('[admin users] No se pudo sincronizar eliminacion en Supabase:', error.message)
        }
      }

      return NextResponse.json({ ok: true })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const supabase = createAdminSupabaseClient()
    const { error } = hardDelete
      ? await supabase.auth.admin.deleteUser(id)
      : await supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos eliminar usuario'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
