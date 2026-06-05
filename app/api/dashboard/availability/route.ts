import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAllAvailability, createAvailability } from '@/lib/google/sheets'
import { AvailabilitySchema } from '@/lib/validation'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const availability = await getAllAvailability()
    return NextResponse.json({ availability })
  } catch {
    return NextResponse.json({ error: 'Error al obtener disponibilidad' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body   = await req.json()
    const parsed = AvailabilitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await createAvailability({ id: uuidv4(), active: true, ...parsed.data })
    return NextResponse.json({ message: 'Disponibilidad creada' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear disponibilidad' }, { status: 500 })
  }
}
