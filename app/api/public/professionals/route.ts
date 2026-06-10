import { NextResponse } from 'next/server'
import { getAllProfessionals } from '@/lib/google/sheets'

export async function GET() {
  try {
    const professionals = await getAllProfessionals()

    return NextResponse.json({
      professionals: professionals.map((professional) => ({
        id: professional.id,
        slug: professional.slug,
        name: professional.name,
        specialty: professional.specialty,
        professionalType: professional.professionalType || professional.specialty,
        centerName: professional.centerName || 'NeuroPlus',
        publicDescription: professional.publicDescription,
        photoUrl: professional.photoUrl || '',
      })),
    })
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar los profesionales' }, { status: 500 })
  }
}
