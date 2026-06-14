import { getAppointmentsByDate, getRemindersSent, logReminderSent, getProfessionalById } from './google/sheets'
import { sendReminderEmail } from './email'
import { TIMEZONE } from './date'

type ReminderResult = {
  sent: number
  skipped: number
  errors: string[]
}

function nowInChile(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }))
}

function appointmentDateTimeInChile(date: string, startTime: string): Date {
  const [h, m] = startTime.split(':').map(Number)
  const [year, month, day] = date.split('-').map(Number)
  const dt = new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }))
  dt.setFullYear(year, month - 1, day)
  dt.setHours(h, m, 0, 0)
  return dt
}

export async function sendPendingReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, errors: [] }

  const now = nowInChile()

  const todayStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)
  const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA', { timeZone: TIMEZONE })

  const [todayAppts, tomorrowAppts, sentLog] = await Promise.all([
    getAppointmentsByDate(todayStr),
    getAppointmentsByDate(tomorrowStr),
    getRemindersSent(),
  ])

  const sentSet = new Set(sentLog.map((s) => `${s.type}::${s.appointmentId}`))

  const tasks: Array<() => Promise<void>> = []

  for (const appt of todayAppts) {
    if (!appt.patientEmail) continue
    const apptTime = appointmentDateTimeInChile(appt.date, appt.startTime)
    const diffMinutes = (apptTime.getTime() - now.getTime()) / 60_000

    if (diffMinutes >= 90 && diffMinutes <= 180 && !sentSet.has(`2h::${appt.id}`)) {
      tasks.push(async () => {
        try {
          const professional = await getProfessionalById(appt.professionalId)
          await sendReminderEmail({
            patientName: appt.patientName,
            patientEmail: appt.patientEmail,
            professionalName: professional?.name ?? appt.professionalSlug,
            centerName: professional?.centerName ?? '',
            date: appt.date,
            startTime: appt.startTime,
            type: '2h',
          })
          await logReminderSent(appt.id, '2h')
          result.sent++
        } catch (err) {
          result.errors.push(`2h::${appt.id}: ${String(err)}`)
        }
      })
    }
  }

  for (const appt of tomorrowAppts) {
    if (!appt.patientEmail) continue
    const apptTime = appointmentDateTimeInChile(appt.date, appt.startTime)
    const diffHours = (apptTime.getTime() - now.getTime()) / 3_600_000

    if (diffHours >= 20 && diffHours <= 30 && !sentSet.has(`24h::${appt.id}`)) {
      tasks.push(async () => {
        try {
          const professional = await getProfessionalById(appt.professionalId)
          await sendReminderEmail({
            patientName: appt.patientName,
            patientEmail: appt.patientEmail,
            professionalName: professional?.name ?? appt.professionalSlug,
            centerName: professional?.centerName ?? '',
            date: appt.date,
            startTime: appt.startTime,
            type: '24h',
          })
          await logReminderSent(appt.id, '24h')
          result.sent++
        } catch (err) {
          result.errors.push(`24h::${appt.id}: ${String(err)}`)
        }
      })
    } else {
      result.skipped++
    }
  }

  for (const task of tasks) {
    await task()
  }

  return result
}
