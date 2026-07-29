import { NextResponse } from 'next/server'
import { deleteAvailability } from '@/lib/google/sheets'
import { requireAvailabilityAccess, requireDashboardUser } from '@/lib/auth/permissions'
import { getRequestIp, logAuditEvent } from '@/lib/audit'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const availability = await requireAvailabilityAccess(id)
    const actorContext = await requireDashboardUser()
    await deleteAvailability(id)

    logAuditEvent({
      actorEmail: actorContext.user?.email ?? '',
      actorRole: actorContext.role,
      action: 'delete',
      entityType: 'availability',
      entityId: id,
      details: { professionalId: availability.professionalId, dayOfWeek: availability.dayOfWeek },
      ip: getRequestIp(req),
    })

    return NextResponse.json({ message: 'Disponibilidad eliminada' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al eliminar'
    const status = message.includes('No autorizado') ? 403 : message.includes('no encontrada') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
