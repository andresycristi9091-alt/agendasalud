import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { requireAdmin } from '@/lib/auth/admin'
import { AdminProfessionalSchema } from '@/lib/validation'
import {
  createProfessional,
  getAllProfessionalsForAdmin,
} from '@/lib/google/sheets'
import { getRequestIp, logAuditEvent } from '@/lib/audit'

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
    const adminContext = await requireAdmin()
    const body = await req.json()
    const parsed = AdminProfessionalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const professionalId = uuidv4()
    await createProfessional({
      id: professionalId,
      ...parsed.data,
    })

    logAuditEvent({
      actorEmail: adminContext.user?.email ?? '',
      actorRole: adminContext.role,
      action: 'create',
      entityType: 'professional',
      entityId: professionalId,
      details: { name: parsed.data.name, slug: parsed.data.slug, centerId: parsed.data.centerId },
      ip: getRequestIp(req),
    })

    const professionals = await getAllProfessionalsForAdmin()
    return NextResponse.json({ professionals }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos crear el profesional' }, { status: 500 })
  }
}
