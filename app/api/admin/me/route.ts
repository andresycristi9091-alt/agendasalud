import { NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth/admin'

export async function GET() {
  const context = await getCurrentUserRole()

  return NextResponse.json({
    user: context.user
      ? {
          id: context.user.id,
          email: context.user.email,
          name: context.user.user_metadata?.name ?? '',
          centerId: context.user.user_metadata?.centerId ?? '',
        }
      : null,
    role: context.role,
    isAdmin: context.isAdmin,
  })
}
