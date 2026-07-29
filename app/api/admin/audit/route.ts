import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getAuditLog } from '@/lib/google/sheets'

export async function GET(req: Request) {
  try {
    await requireAdmin()

    const url = new URL(req.url)
    const entityType = url.searchParams.get('entityType') ?? ''
    const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '100', 10)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100

    const events = await getAuditLog(500)
    const filtered = entityType
      ? events.filter((event) => event.entityType === entityType)
      : events

    return NextResponse.json({ events: filtered.slice(0, limit) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener auditoria'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
