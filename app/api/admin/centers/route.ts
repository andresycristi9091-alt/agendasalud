import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { requireAdmin } from '@/lib/auth/admin'
import { AdminCenterSchema } from '@/lib/validation'
import { createCenter, ensureDefaultCenter, getAllCenters } from '@/lib/google/sheets'

export async function GET() {
  try {
    await requireAdmin()
    await ensureDefaultCenter()
    const centers = await getAllCenters()
    return NextResponse.json({ centers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No autorizado' }, { status: 403 })
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const body = await req.json()
    const parsed = AdminCenterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    await createCenter({
      id: uuidv4(),
      ...parsed.data,
    })

    const centers = await getAllCenters()
    return NextResponse.json({ centers }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos crear centro' }, { status: 500 })
  }
}
