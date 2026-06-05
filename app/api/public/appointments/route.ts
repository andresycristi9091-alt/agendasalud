import { NextResponse } from 'next/server'
import { AppointmentSchema } from '@/lib/validation'
import { bookAppointment } from '@/lib/appointments'

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = AppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await bookAppointment(parsed.data)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json({
      message:         'Cita agendada correctamente',
      appointmentId:   result.appointmentId,
      calendarEventId: result.calendarEventId,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
