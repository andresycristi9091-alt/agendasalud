import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { requireAdmin } from '@/lib/auth/admin'
import { getAllowedProfessionals, requireProfessionalAccess } from '@/lib/auth/permissions'
import { createAvailabilityException, getAvailabilityExceptions } from '@/lib/google/sheets'
import { AvailabilityExceptionSchema } from '@/lib/validation'
import { getRequestIp, logAuditEvent } from '@/lib/audit'

export async function GET() {
  try {
    const { context, professionals } = await getAllowedProfessionals()
    const exceptions = await getAvailabilityExceptions()

    if (context.isAdmin) {
      return NextResponse.json({ exceptions })
    }

    const allowedProfessionalIds = new Set(professionals.map((professional) => professional.id))
    const allowedCenterIds = new Set(
      professionals.map((professional) => professional.centerId ?? '').filter(Boolean)
    )

    const visible = exceptions.filter((exception) => {
      if (exception.scope === 'all') return true
      if (exception.scope === 'center') return allowedCenterIds.has(exception.scopeId)
      return allowedProfessionalIds.has(exception.scopeId)
    })

    return NextResponse.json({ exceptions: visible })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener bloqueos'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = AvailabilityExceptionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Bloqueos por centro o globales son exclusivos del administrador.
    const actorContext = parsed.data.scope === 'professional'
      ? (await requireProfessionalAccess(parsed.data.scopeId)).context
      : await requireAdmin()

    const exceptionId = uuidv4()
    await createAvailabilityException({ id: exceptionId, ...parsed.data })

    logAuditEvent({
      actorEmail: actorContext.user?.email ?? '',
      actorRole: actorContext.role,
      action: 'create',
      entityType: 'availability_exception',
      entityId: exceptionId,
      details: {
        scope: parsed.data.scope,
        scopeId: parsed.data.scopeId,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        reason: parsed.data.reason,
      },
      ip: getRequestIp(req),
    })

    return NextResponse.json({ message: 'Bloqueo creado' }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al crear bloqueo'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
