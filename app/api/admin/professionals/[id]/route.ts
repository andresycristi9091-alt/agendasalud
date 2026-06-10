import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { AdminProfessionalSchema } from '@/lib/validation'
import {
  deactivateProfessional,
  getAllProfessionalsForAdmin,
  updateProfessional,
} from '@/lib/google/sheets'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const parsed = AdminProfessionalSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    await updateProfessional(id, parsed.data)
    const professionals = await getAllProfessionalsForAdmin()
    return NextResponse.json({ professionals })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos actualizar' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    await deactivateProfessional(id)
    const professionals = await getAllProfessionalsForAdmin()
    return NextResponse.json({ professionals })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos desactivar' }, { status: 500 })
  }
}
