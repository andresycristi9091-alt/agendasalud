import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateAppointmentStatus } from '@/lib/google/sheets'
import { UpdateStatusSchema } from '@/lib/validation'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { id }   = await params
    const body     = await req.json()
    const parsed   = UpdateStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    await updateAppointmentStatus(id, parsed.data.status)
    return NextResponse.json({ message: 'Estado actualizado' })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
