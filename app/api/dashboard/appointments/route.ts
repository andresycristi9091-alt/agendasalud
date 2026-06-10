import { NextResponse } from 'next/server'
import { getAppointmentsByProfessional } from '@/lib/google/sheets'
import { requireProfessionalAccess } from '@/lib/auth/permissions'
import { ManualAppointmentSchema } from '@/lib/validation'
import { bookAppointmentForProfessional } from '@/lib/appointments'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const professionalId   = searchParams.get('professionalId') ?? ''

  try {
    await requireProfessionalAccess(professionalId)
    const appointments = await getAppointmentsByProfessional(professionalId)
    return NextResponse.json({ appointments })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener citas'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ManualAppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { professional } = await requireProfessionalAccess(parsed.data.professionalId)
    const result = await bookAppointmentForProfessional(professional, parsed.data)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al crear cita manual'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
