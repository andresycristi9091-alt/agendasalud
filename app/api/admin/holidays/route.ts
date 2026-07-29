import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { requireAdmin } from '@/lib/auth/admin'
import { getChileHolidays, getSupportedHolidayYears } from '@/lib/chile-holidays'
import { createAvailabilityException, getAvailabilityExceptions } from '@/lib/google/sheets'
import { getRequestIp, logAuditEvent } from '@/lib/audit'

export async function POST(req: Request) {
  try {
    const adminContext = await requireAdmin()
    const body = await req.json().catch(() => ({}))
    const year = Number.parseInt(String(body.year ?? ''), 10)

    const holidays = getChileHolidays(year)
    if (holidays.length === 0) {
      return NextResponse.json(
        { error: `Ano no soportado. Anos disponibles: ${getSupportedHolidayYears().join(', ')}.` },
        { status: 400 }
      )
    }

    const existing = await getAvailabilityExceptions()
    const existingGlobalDates = new Set(
      existing.filter((exception) => exception.scope === 'all').map((exception) => exception.date)
    )

    const toCreate = holidays.filter((holiday) => !existingGlobalDates.has(holiday.date))

    for (const holiday of toCreate) {
      await createAvailabilityException({
        id: uuidv4(),
        scope: 'all',
        scopeId: '',
        date: holiday.date,
        startTime: '',
        endTime: '',
        reason: `Feriado: ${holiday.name}`,
      })
    }

    logAuditEvent({
      actorEmail: adminContext.user?.email ?? '',
      actorRole: adminContext.role,
      action: 'create',
      entityType: 'availability_exception',
      entityId: `holidays-${year}`,
      details: { year, created: toCreate.length, skipped: holidays.length - toCreate.length },
      ip: getRequestIp(req),
    })

    return NextResponse.json({
      message:
        toCreate.length === 0
          ? `Los feriados de ${year} ya estaban cargados.`
          : `${toCreate.length} feriados de ${year} cargados como bloqueos globales.`,
      created: toCreate.length,
      skipped: holidays.length - toCreate.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al cargar feriados'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
