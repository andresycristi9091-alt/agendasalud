import { NextResponse } from 'next/server'
import { getProfessionalBySlug } from '@/lib/google/sheets'
import { getAvailableSlotsForDate } from '@/lib/availability'
import { todayString } from '@/lib/date'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const url = new URL(_req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'Parametros from y to requeridos' }, { status: 400 })
    }

    const professional = await getProfessionalBySlug(slug)
    if (!professional || !professional.active) {
      return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })
    }

    const fromDate = new Date(from + 'T00:00:00')
    const toDate = new Date(to + 'T00:00:00')

    const diffDays = Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000)
    if (diffDays < 0 || diffDays > 30) {
      return NextResponse.json({ error: 'Rango maximo 30 dias' }, { status: 400 })
    }

    const today = todayString()

    const dates: string[] = []
    const cursor = new Date(fromDate)
    while (cursor <= toDate) {
      const iso = cursor.toISOString().slice(0, 10)
      if (iso >= today) dates.push(iso)
      cursor.setDate(cursor.getDate() + 1)
    }

    const results = await Promise.allSettled(
      dates.map(async (date) => {
        const slots = await getAvailableSlotsForDate(professional, date)
        const hasAvailable = slots.some((s) => s.available)
        return { date, available: hasAvailable }
      })
    )

    const availability: Record<string, boolean> = {}
    for (const result of results) {
      if (result.status === 'fulfilled') {
        availability[result.value.date] = result.value.available
      }
    }

    return NextResponse.json({ availability }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[batch-availability]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
