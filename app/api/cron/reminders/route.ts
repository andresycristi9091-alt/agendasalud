import { NextResponse } from 'next/server'
import { sendPendingReminders } from '@/lib/reminders'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  try {
    const result = await sendPendingReminders()
    console.log('[cron/reminders] resultado:', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/reminders] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
