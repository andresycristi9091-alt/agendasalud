import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, requireAdmin } from '@/lib/auth/admin'
import { AdminUserUpdateSchema } from '@/lib/validation'

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
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos actualizar usuario'
    return NextResponse.json({ error: message }, { status: message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 501 : 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos eliminar usuario'
    return NextResponse.json({ error: message }, { status: message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 501 : 500 })
  }
}
