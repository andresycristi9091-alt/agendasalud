import { NextResponse } from 'next/server'
import { getProfessionalBySlug } from '@/lib/google/sheets'
import { getAvailableSlotsForDate } from '@/lib/availability'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Parámetro date inválido (YYYY-MM-DD)' }, { status: 400 })
    }

    const professional = await getProfessionalBySlug(slug)
    if (!professional) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const slots = await getAvailableSlotsForDate(professional, date)
    return NextResponse.json({ slots })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
