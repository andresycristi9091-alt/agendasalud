import { NextResponse } from 'next/server'
import { getAppointmentsByPatientEmail, getProfessionalById } from '@/lib/google/sheets'
import { z } from 'zod'

const Schema = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Correo invalido' }, { status: 400 })
  }

  const appointments = await getAppointmentsByPatientEmail(parsed.data.email).catch(() => [])

  const enriched = await Promise.all(
    appointments.map(async (a) => {
      const professional = await getProfessionalById(a.professionalId).catch(() => null)
      return {
        id: a.id,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        reason: a.reason,
        professionalName: professional?.name ?? '',
        specialty: professional?.specialty ?? '',
        centerName: professional?.centerName ?? a.professionalSlug,
        professionalSlug: a.professionalSlug,
      }
    })
  )

  return NextResponse.json({ appointments: enriched })
}
