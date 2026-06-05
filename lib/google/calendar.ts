import { google } from 'googleapis'

function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key:  privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

function getCalendarClient() {
  return google.calendar({ version: 'v3', auth: getAuth() })
}

export type CreateEventParams = {
  calendarId:   string
  summary:      string
  description:  string
  startDateTime: string
  endDateTime:  string
  timezone:     string
  attendeeEmail?: string
}

// Crear evento en Google Calendar
export async function createCalendarEvent(params: CreateEventParams): Promise<string> {
  const calendar = getCalendarClient()

  const attendees = params.attendeeEmail
    ? [{ email: params.attendeeEmail }]
    : []

  const res = await calendar.events.insert({
    calendarId: params.calendarId,
    requestBody: {
      summary:     params.summary,
      description: params.description,
      start: {
        dateTime: params.startDateTime,
        timeZone: params.timezone,
      },
      end: {
        dateTime: params.endDateTime,
        timeZone: params.timezone,
      },
      attendees,
      status:     'confirmed',
      visibility: 'private',
    },
  })

  return res.data.id ?? ''
}

// Cancelar evento en Google Calendar
export async function cancelCalendarEvent(
  calendarId: string,
  eventId:    string
): Promise<void> {
  const calendar = getCalendarClient()
  await calendar.events.delete({ calendarId, eventId })
}

// Obtener horas ocupadas via FreeBusy
export async function getBusySlots(
  calendarId: string,
  timeMin:    string,
  timeMax:    string,
  timezone:   string
): Promise<Array<{ start: string; end: string }>> {
  const calendar = getCalendarClient()

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: timezone,
      items:    [{ id: calendarId }],
    },
  })

  const busy = res.data.calendars?.[calendarId]?.busy ?? []
  return busy
    .filter((b) => b.start && b.end)
    .map((b) => ({ start: b.start!, end: b.end! }))
}
