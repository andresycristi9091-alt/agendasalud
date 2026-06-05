import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteAvailability } from '@/lib/google/sheets'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { id } = await params
    await deleteAvailability(id)
    return NextResponse.json({ message: 'Disponibilidad eliminada' })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
