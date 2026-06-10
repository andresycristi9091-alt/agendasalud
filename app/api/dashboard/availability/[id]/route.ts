import { NextResponse } from 'next/server'
import { deleteAvailability } from '@/lib/google/sheets'
import { requireAvailabilityAccess } from '@/lib/auth/permissions'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireAvailabilityAccess(id)
    await deleteAvailability(id)
    return NextResponse.json({ message: 'Disponibilidad eliminada' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al eliminar'
    const status = message.includes('No autorizado') ? 403 : message.includes('no encontrada') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
