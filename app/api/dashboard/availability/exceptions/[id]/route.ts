import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { requireProfessionalAccess } from '@/lib/auth/permissions'
import { deleteAvailabilityException, getAvailabilityExceptions } from '@/lib/google/sheets'
import { getRequestIp, logAuditEvent } from '@/lib/audit'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const exceptions = await getAvailabilityExceptions()
    const exception = exceptions.find((item) => item.id === id)

    if (!exception) {
      return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 })
    }

    const actorContext = exception.scope === 'professional'
      ? (await requireProfessionalAccess(exception.scopeId)).context
      : await requireAdmin()

    await deleteAvailabilityException(id)

    logAuditEvent({
      actorEmail: actorContext.user?.email ?? '',
      actorRole: actorContext.role,
      action: 'delete',
      entityType: 'availability_exception',
      entityId: id,
      details: { scope: exception.scope, scopeId: exception.scopeId, date: exception.date },
      ip: getRequestIp(req),
    })

    return NextResponse.json({ message: 'Bloqueo eliminado' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al eliminar bloqueo'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
