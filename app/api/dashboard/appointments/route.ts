import { NextResponse } from 'next/server'
import { getAppointmentsByProfessional } from '@/lib/google/sheets'
import { requireProfessionalAccess } from '@/lib/auth/permissions'

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
