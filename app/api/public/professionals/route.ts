import { NextResponse } from 'next/server'
import { getAllProfessionals } from '@/lib/google/sheets'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const centerId = searchParams.get('centerId')
    const professionals = await getAllProfessionals()
    const filtered = centerId
      ? professionals.filter((professional) => professional.centerId === centerId)
      : professionals

    return NextResponse.json({
      professionals: filtered.map((professional) => ({
        id: professional.id,
        slug: professional.slug,
        name: professional.name,
        specialty: professional.specialty,
        professionalType: professional.professionalType || professional.specialty,
        centerName: professional.centerName || 'NeuroPlus',
        centerId: professional.centerId || '',
        publicDescription: professional.publicDescription,
        photoUrl: professional.photoUrl || '',
      })),
    })
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar los profesionales' }, { status: 500 })
  }
}
