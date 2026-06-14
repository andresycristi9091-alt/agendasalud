import { NextResponse } from 'next/server'
import { getAppointmentById, getProfessionalById } from '@/lib/google/sheets'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const appointment = await getAppointmentById(id).catch(() => null)
  if (!appointment) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

  const professional = await getProfessionalById(appointment.professionalId).catch(() => null)

  return NextResponse.json({
    id: appointment.id,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    reason: appointment.reason,
    professional: professional
      ? {
          name: professional.name,
          specialty: professional.specialty,
          centerName: professional.centerName,
          email: professional.email,
        }
      : null,
  })
}
