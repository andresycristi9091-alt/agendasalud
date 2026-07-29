import { NextResponse } from 'next/server'
import { deleteAvailability, getAppointmentsByDateAndProfessional } from '@/lib/google/sheets'
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

    // Invariante I-07 del blueprint: eliminar oferta nunca borra citas, pero
    // avisamos si el bloque tiene citas activas para que no queden invisibles.
    const isExactDate = /^\d{4}-\d{2}-\d{2}$/.test(availability.dayOfWeek)
    const activeAppointments = isExactDate
      ? (await getAppointmentsByDateAndProfessional(availability.professionalId, availability.dayOfWeek)
          .catch(() => []))
          .filter((appointment) => ['confirmada', 'reagendada'].includes(appointment.status))
          .length
      : 0

    await deleteAvailability(id)

    logAuditEvent({
      actorEmail: actorContext.user?.email ?? '',
      actorRole: actorContext.role,
      action: 'delete',
      entityType: 'availability',
      entityId: id,
      details: {
        professionalId: availability.professionalId,
        dayOfWeek: availability.dayOfWeek,
        activeAppointments,
      },
      ip: getRequestIp(req),
    })

    return NextResponse.json({
      message: 'Disponibilidad eliminada',
      activeAppointments,
      warning: activeAppointments > 0
        ? `Ojo: ese dia quedan ${activeAppointments} cita(s) activas ya tomadas. Siguen vigentes; cancelalas o reagendalas desde la agenda si corresponde.`
        : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al eliminar'
    const status = message.includes('No autorizado') ? 403 : message.includes('no encontrada') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
