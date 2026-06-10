import { NextResponse } from 'next/server'
import { createAvailability, getAllAvailability } from '@/lib/google/sheets'
import { AvailabilitySchema } from '@/lib/validation'
import { getAllowedProfessionals, requireProfessionalAccess } from '@/lib/auth/permissions'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  try {
    const { professionals } = await getAllowedProfessionals()
    const allowedIds = new Set(professionals.map((professional) => professional.id))
    const availability = await getAllAvailability()

    return NextResponse.json({
      availability: availability.filter((block) => allowedIds.has(block.professionalId)),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener disponibilidad'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = AvailabilitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await requireProfessionalAccess(parsed.data.professionalId)
    await createAvailability({ id: uuidv4(), active: true, ...parsed.data })
    return NextResponse.json({ message: 'Disponibilidad creada' }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al crear disponibilidad'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
