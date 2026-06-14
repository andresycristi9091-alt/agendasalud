import { NextResponse } from 'next/server'
import { getAppointmentById, updateAppointmentStatus, getProfessionalById } from '@/lib/google/sheets'
import { cancelCalendarEvent } from '@/lib/google/calendar'
import { sendCancellationEmail } from '@/lib/email'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { email?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida' }, { status: 400 })
  }

  if (!body.email || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'Se requiere el correo del paciente para confirmar la cancelacion' }, { status: 400 })
  }

  const appointment = await getAppointmentById(id).catch(() => null)
  if (!appointment) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }

  if (appointment.patientEmail.trim().toLowerCase() !== body.email.trim().toLowerCase()) {
    return NextResponse.json({ error: 'El correo no coincide con el registrado para esta cita' }, { status: 403 })
  }

  if (appointment.status === 'cancelada') {
    return NextResponse.json({ error: 'Esta cita ya fue cancelada' }, { status: 409 })
  }

  if (appointment.status === 'completada') {
    return NextResponse.json({ error: 'No se puede cancelar una cita ya completada' }, { status: 409 })
  }

  await updateAppointmentStatus(id, 'cancelada')

  // Cancelar evento en Google Calendar
  if (appointment.googleCalendarEventId) {
    const professional = await getProfessionalById(appointment.professionalId).catch(() => null)
    const calId = professional?.calendarId || professional?.email || process.env.GOOGLE_CALENDAR_ID || ''
    if (calId) {
      cancelCalendarEvent(calId, appointment.googleCalendarEventId).catch((err) =>
        console.warn('[cancel] Error eliminando evento Calendar:', err)
      )
    }
  }

  // Enviar email de cancelacion al paciente
  const professional = await getProfessionalById(appointment.professionalId).catch(() => null)
  sendCancellationEmail({
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    professionalName: professional?.name ?? 'el profesional',
    centerName: professional?.centerName ?? 'el centro',
    date: appointment.date,
    startTime: appointment.startTime,
    cancelledBy: 'patient',
  }).catch((err) => console.warn('[cancel] Error enviando email:', err))

  return NextResponse.json({ ok: true, message: 'Cita cancelada correctamente' })
}
