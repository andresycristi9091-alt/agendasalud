import { NextResponse } from 'next/server'
import { setLocalAdminSession } from '@/lib/auth/local-admin-session'

const ADMIN_EMAIL = 'admin@agendasalud.cl'

export async function POST(req: Request) {
  const formData = await req.formData()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!['admin', ADMIN_EMAIL].includes(email) || password !== 'admin') {
    return NextResponse.redirect(new URL('/login?error=admin', req.url), { status: 303 })
  }

  const response = NextResponse.redirect(new URL('/dashboard', req.url), { status: 303 })
  await setLocalAdminSession(response)
  return response
}
