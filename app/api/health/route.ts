import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'agendasalud-aps',
    timestamp: new Date().toISOString(),
  })
}
