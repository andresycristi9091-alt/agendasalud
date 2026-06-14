import { NextResponse } from 'next/server'
import { updateAppointmentStatus, getAppointmentById, getProfessionalById } from '@/lib/google/sheets'
import { cancelCalendarEvent } from '@/lib/google/calendar'
import { sendCancellationEmail } from '@/lib/email'
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

    const appointment = await getAppointmentById(id)

    await updateAppointmentStatus(id, parsed.data.status)

    if (parsed.data.status === 'cancelada' && appointment) {
      // Eliminar evento de Google Calendar
      if (appointment.googleCalendarEventId) {
        const professional = await getProfessionalById(appointment.professionalId).catch(() => null)
        const calId = professional?.calendarId || professional?.email || process.env.GOOGLE_CALENDAR_ID || ''
        if (calId) {
          cancelCalendarEvent(calId, appointment.googleCalendarEventId).catch((err) =>
            console.warn('[dashboard cancel] Error eliminando evento Calendar:', err)
          )
        }
      }

      // Enviar email de cancelacion al paciente
      const professional = await getProfessionalById(appointment.professionalId).catch(() => null)
      sendCancellationEmail({
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        professionalName: professional?.name ?? 'el profesional',
        centerName: professional?.centerName ?? '',
        date: appointment.date,
        startTime: appointment.startTime,
        cancelledBy: 'professional',
      }).catch((err) => console.warn('[dashboard cancel] Error enviando email:', err))
    }

    return NextResponse.json({ message: 'Estado actualizado' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al actualizar'
    const status = message.includes('No autorizado') ? 403 : message.includes('no encontrada') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
