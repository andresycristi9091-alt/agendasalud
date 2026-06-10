import { NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth/admin'

export async function GET() {
  const context = await getCurrentUserRole()

  if (!context.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.user_metadata?.name ?? '',
      centerId: context.user.user_metadata?.centerId ?? '',
    },
    role: context.role,
    isAdmin: context.isAdmin,
  })
}
