import { NextResponse } from 'next/server'
import { getProfessionalBySlug } from '@/lib/google/sheets'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const professional = await getProfessionalBySlug(slug)

    if (!professional) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    // Solo datos públicos
    return NextResponse.json({
      slug:               professional.slug,
      name:               professional.name,
      specialty:          professional.specialty,
      centerName:         professional.centerName,
      publicDescription:  professional.publicDescription,
      appointmentDurationDefault: professional.appointmentDurationDefault,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
