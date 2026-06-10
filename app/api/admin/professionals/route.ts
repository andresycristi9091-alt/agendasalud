import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { requireAdmin } from '@/lib/auth/admin'
import { AdminProfessionalSchema } from '@/lib/validation'
import {
  createProfessional,
  getAllProfessionalsForAdmin,
} from '@/lib/google/sheets'

export async function GET() {
  try {
    await requireAdmin()
    const professionals = await getAllProfessionalsForAdmin()
    return NextResponse.json({ professionals })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No autorizado' }, { status: 403 })
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json()
    const parsed = AdminProfessionalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    await createProfessional({
      id: uuidv4(),
      ...parsed.data,
    })

    const professionals = await getAllProfessionalsForAdmin()
    return NextResponse.json({ professionals }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos crear el profesional' }, { status: 500 })
  }
}
