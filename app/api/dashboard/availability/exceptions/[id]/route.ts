import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { requireProfessionalAccess } from '@/lib/auth/permissions'
import { deleteAvailabilityException, getAvailabilityExceptions } from '@/lib/google/sheets'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const exceptions = await getAvailabilityExceptions()
    const exception = exceptions.find((item) => item.id === id)

    if (!exception) {
      return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 })
    }

    if (exception.scope === 'professional') {
      await requireProfessionalAccess(exception.scopeId)
    } else {
      await requireAdmin()
    }

    await deleteAvailabilityException(id)
    return NextResponse.json({ message: 'Bloqueo eliminado' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al eliminar bloqueo'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
