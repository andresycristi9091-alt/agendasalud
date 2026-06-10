import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, requireAdmin } from '@/lib/auth/admin'
import { AdminUserUpdateSchema } from '@/lib/validation'
import { hashPassword } from '@/lib/auth/password'
import { updateManagedUser } from '@/lib/google/sheets'

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

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const updated = await updateManagedUser(id, {
        name: parsed.data.name,
        role: parsed.data.role,
        centerId: parsed.data.centerId,
        ...(parsed.data.password ? { passwordHash: hashPassword(parsed.data.password) } : {}),
      })

      return NextResponse.json({
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          centerId: updated.centerId,
          source: 'AgendaSalud',
        },
      })
    }

    const supabase = createAdminSupabaseClient()
    const payload: {
      password?: string
      user_metadata?: { role?: string; name?: string; centerId?: string }
    } = {
      user_metadata: {},
    }

    if (parsed.data.password) payload.password = parsed.data.password
    if (parsed.data.role) payload.user_metadata!.role = parsed.data.role
    if (parsed.data.name) payload.user_metadata!.name = parsed.data.name
    if (parsed.data.centerId !== undefined) payload.user_metadata!.centerId = parsed.data.centerId

    const { data, error } = await supabase.auth.admin.updateUserById(id, payload)
    if (error) throw error

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? '',
        role: data.user.user_metadata?.role ?? 'user',
        centerId: data.user.user_metadata?.centerId ?? '',
        source: 'Supabase',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos actualizar usuario'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await updateManagedUser(id, { active: false })
      return NextResponse.json({ ok: true })
    }

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos eliminar usuario'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
