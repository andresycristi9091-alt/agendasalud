import { NextResponse } from 'next/server'
import { AppointmentSchema } from '@/lib/validation'
import { bookAppointment } from '@/lib/appointments'
import { sendBookingConfirmation } from '@/lib/email'
import { getProfessionalBySlug } from '@/lib/google/sheets'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = AppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const limit = rateLimit(
      req,
      `public-booking:${parsed.data.professionalSlug}:${parsed.data.patientEmail}`,
      { limit: 5, windowMs: 10 * 60 * 1000 }
    )

    if (!limit.allowed) {
      return rateLimitResponse(
        limit,
        'Detectamos muchos intentos de agendamiento. Espera unos minutos antes de intentar nuevamente.'
      )
    }

    const result = await bookAppointment(parsed.data)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    // Enviar confirmacion por email (no bloquea la respuesta si falla)
    getProfessionalBySlug(parsed.data.professionalSlug).then((professional) => {
      if (!professional) return
      sendBookingConfirmation({
        patientName:      parsed.data.patientName,
        patientEmail:     parsed.data.patientEmail,
        professionalName: professional.name,
        specialty:        professional.specialty,
        centerName:       professional.centerName ?? 'AgendaSalud',
        date:             parsed.data.date,
        startTime:        parsed.data.startTime,
        endTime:          parsed.data.endTime,
        appointmentId:    result.appointmentId,
      }).catch((error) => console.error('[booking] email confirmation error:', error))
    }).catch(() => null)

    return NextResponse.json({
      message:         'Cita agendada correctamente',
      appointmentId:   result.appointmentId,
      calendarEventId: result.calendarEventId,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
