import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppointmentsByProfessional } from '@/lib/google/sheets'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const professionalId   = searchParams.get('professionalId') ?? ''

  try {
    const appointments = await getAppointmentsByProfessional(professionalId)
    return NextResponse.json({ appointments })
  } catch {
    return NextResponse.json({ error: 'Error al obtener citas' }, { status: 500 })
  }
}
