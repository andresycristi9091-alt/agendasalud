import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { AdminCenterSchema } from '@/lib/validation'
import { getAllCenters, updateCenter } from '@/lib/google/sheets'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const parsed = AdminCenterSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    await updateCenter(id, parsed.data)
    const centers = await getAllCenters()
    return NextResponse.json({ centers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos actualizar centro' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    await updateCenter(id, { active: false })
    const centers = await getAllCenters()
    return NextResponse.json({ centers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos desactivar centro' }, { status: 500 })
  }
}
