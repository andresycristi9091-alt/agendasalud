import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isPrimaryAdminEmail, requireAdmin } from '@/lib/auth/admin'
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
      const requestedEmail = parsed.data.email?.toLowerCase() ?? managedUser.email.toLowerCase()
      const isPrimaryAdmin = isPrimaryAdminEmail(requestedEmail)
      const wasPrimaryAdmin = isPrimaryAdminEmail(managedUser.email)

      if (wasPrimaryAdmin && requestedEmail !== managedUser.email.toLowerCase()) {
        return NextResponse.json({ error: 'No se puede cambiar el correo del administrador principal.' }, { status: 403 })
      }

      if (!wasPrimaryAdmin && isPrimaryAdmin) {
        return NextResponse.json({ error: 'Ese correo esta reservado para el administrador principal.' }, { status: 403 })
      }

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
        email: requestedEmail,
        name: parsed.data.name,
        role: isPrimaryAdmin ? 'admin' : 'user',
        centerId: isPrimaryAdmin ? '' : parsed.data.centerId,
        active: isPrimaryAdmin ? true : parsed.data.active,
        ...(parsed.data.password ? { passwordHash: hashPassword(parsed.data.password) } : {}),
      })

      await syncSupabaseUserByEmail(managedUser.email, {
        ...(parsed.data.email ? { email: requestedEmail } : {}),
        ...(parsed.data.password ? { password: parsed.data.password } : {}),
        user_metadata: {
          role: isPrimaryAdmin ? 'admin' : 'user',
          ...(parsed.data.name ? { name: parsed.data.name } : {}),
          centerId: isPrimaryAdmin ? '' : (parsed.data.centerId ?? managedUser.centerId),
        },
        ...(isPrimaryAdmin || parsed.data.active === true ? { ban_duration: 'none' } : {}),
        ...(!isPrimaryAdmin && parsed.data.active === false ? { ban_duration: '876000h' } : {}),
      })

      return NextResponse.json({
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: isPrimaryAdmin ? 'admin' : 'user',
          centerId: isPrimaryAdmin ? '' : updated.centerId,
          active: isPrimaryAdmin ? true : updated.active,
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

    const requestedEmail = parsed.data.email?.toLowerCase()
    const supabaseUser = await supabase.auth.admin.getUserById(id)
    const finalEmail = requestedEmail ?? supabaseUser.data.user?.email ?? ''
    const isPrimaryAdmin = isPrimaryAdminEmail(finalEmail)
    const wasPrimaryAdmin = isPrimaryAdminEmail(supabaseUser.data.user?.email)

    if (wasPrimaryAdmin && requestedEmail && requestedEmail !== supabaseUser.data.user?.email?.toLowerCase()) {
      return NextResponse.json({ error: 'No se puede cambiar el correo del administrador principal.' }, { status: 403 })
    }

    if (!wasPrimaryAdmin && isPrimaryAdmin) {
      return NextResponse.json({ error: 'Ese correo esta reservado para el administrador principal.' }, { status: 403 })
    }

    if (parsed.data.email) payload.email = requestedEmail
    if (parsed.data.password) payload.password = parsed.data.password
    payload.user_metadata!.role = isPrimaryAdmin ? 'admin' : 'user'
    if (parsed.data.name) payload.user_metadata!.name = parsed.data.name
    payload.user_metadata!.centerId = isPrimaryAdmin ? '' : (parsed.data.centerId ?? '')
    if (isPrimaryAdmin || parsed.data.active === true) payload.ban_duration = 'none'
    if (!isPrimaryAdmin && parsed.data.active === false) payload.ban_duration = '876000h'

    const { data, error } = await supabase.auth.admin.updateUserById(id, payload)
    if (error) throw error

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? '',
        role: isPrimaryAdmin ? 'admin' : 'user',
        centerId: isPrimaryAdmin ? '' : data.user.user_metadata?.centerId ?? '',
        active: isPrimaryAdmin ? true : !data.user.banned_until,
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
      if (isPrimaryAdminEmail(managedUser.email)) {
        return NextResponse.json({ error: 'El administrador principal no se puede eliminar ni desactivar.' }, { status: 403 })
      }

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
    const supabaseUser = await supabase.auth.admin.getUserById(id)
    if (isPrimaryAdminEmail(supabaseUser.data.user?.email)) {
      return NextResponse.json({ error: 'El administrador principal no se puede eliminar ni desactivar.' }, { status: 403 })
    }
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
