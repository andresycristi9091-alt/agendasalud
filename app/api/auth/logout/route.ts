import { NextResponse } from 'next/server'
import { clearLocalAdminSession } from '@/lib/auth/local-admin-session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearLocalAdminSession(response)
  return response
}
