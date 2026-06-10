import { NextResponse } from 'next/server'
import { getAllowedProfessionals } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const { professionals } = await getAllowedProfessionals()

    return NextResponse.json({
      professionals: professionals
        .filter((professional) => professional.active)
        .map((professional) => ({
          id: professional.id,
          slug: professional.slug,
          name: professional.name,
          specialty: professional.specialty,
          professionalType: professional.professionalType || professional.specialty,
          photoUrl: professional.photoUrl || '',
          centerId: professional.centerId || '',
          centerName: professional.centerName || '',
        })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener profesionales'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
