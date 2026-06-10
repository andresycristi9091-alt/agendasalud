import { NextResponse } from 'next/server'
import { updateAppointmentStatus } from '@/lib/google/sheets'
import { UpdateStatusSchema } from '@/lib/validation'
import { requireAppointmentAccess } from '@/lib/auth/permissions'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Estado invalido' }, { status: 400 })
    }

    await requireAppointmentAccess(id)
    await updateAppointmentStatus(id, parsed.data.status)
    return NextResponse.json({ message: 'Estado actualizado' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al actualizar'
    const status = message.includes('No autorizado') ? 403 : message.includes('no encontrada') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
