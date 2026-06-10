import { google } from 'googleapis'

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key:  privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

const SHEET_ID = process.env.GOOGLE_SHEETS_ID ?? ''

// â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type Professional = {
  id:                        string
  slug:                      string
  name:                      string
  specialty:                 string
  centerName:                string
  email:                     string
  phone:                     string
  calendarId:                string
  publicDescription:         string
  appointmentDurationDefault: number
  timezone:                  string
  active:                    boolean
  createdAt:                 string
  updatedAt:                 string
}

export type Availability = {
  id:           string
  professionalId: string
  dayOfWeek:    string
  startTime:    string
  endTime:      string
  slotDuration: number
  active:       boolean
  createdAt:    string
  updatedAt:    string
}

export type Appointment = {
  id:                   string
  professionalId:       string
  professionalSlug:     string
  patientName:          string
  patientEmail:         string
  patientPhone:         string
  patientRut:           string
  reason:               string
  date:                 string
  startTime:            string
  endTime:              string
  timezone:             string
  status:               'confirmada' | 'cancelada' | 'completada' | 'no_asiste'
  googleCalendarEventId: string
  createdAt:            string
  updatedAt:            string
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function rowToObject<T>(headers: string[], row: string[]): T {
  const obj: Record<string, string> = {}
  headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
  return obj as T
}

async function getSheetData(range: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  })
  return (res.data.values ?? []) as string[][]
}

async function appendRow(range: string, values: string[]): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId:    SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody:      { values: [values] },
  })
}


// â”€â”€ Professionals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getProfessionalBySlug(slug: string): Promise<Professional | null> {
  const rows = await getSheetData('professionals!A:N')
  if (rows.length < 2) return null
  const headers = rows[0]
  const found   = rows.slice(1).find((r) => r[1] === slug && r[11]?.toUpperCase() === 'TRUE')
  if (!found) return null
  return rowToObject<Professional>(headers, found)
}

export async function getAllProfessionals(): Promise<Professional[]> {
  const rows = await getSheetData('professionals!A:N')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).map((r) => rowToObject<Professional>(headers, r))
}

// â”€â”€ Availability â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getAvailabilityByProfessional(professionalId: string): Promise<Availability[]> {
  const rows = await getSheetData('availability!A:I')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1)
    .filter((r) => r[1] === professionalId && r[6]?.toUpperCase() === 'TRUE')
    .map((r) => rowToObject<Availability>(headers, r))
}

export async function getAllAvailability(): Promise<Availability[]> {
  const rows = await getSheetData('availability!A:I')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).map((r) => rowToObject<Availability>(headers, r))
}

export async function createAvailability(data: Omit<Availability, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date().toISOString()
  await appendRow('availability!A:I', [
    data.id, data.professionalId, data.dayOfWeek,
    data.startTime, data.endTime, String(data.slotDuration),
    data.active ? 'TRUE' : 'FALSE', now, now,
  ])
}

export async function deleteAvailability(id: string): Promise<void> {
  const rows = await getSheetData('availability!A:I')
  const idx  = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (idx === -1) return
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId:    SHEET_ID,
    range:            `availability!G${idx + 1}`,
    valueInputOption: 'RAW',
    requestBody:      { values: [['FALSE']] },
  })
}

// â”€â”€ Appointments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getAppointmentsByProfessional(professionalId: string): Promise<Appointment[]> {
  const rows = await getSheetData('appointments!A:Q')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1)
    .filter((r) => r[1] === professionalId)
    .map((r) => rowToObject<Appointment>(headers, r))
}

export async function getAppointmentsByDateAndProfessional(
  professionalId: string,
  date: string
): Promise<Appointment[]> {
  const all = await getAppointmentsByProfessional(professionalId)
  return all.filter((a) => a.date === date && a.status !== 'cancelada')
}

export async function createAppointment(data: Omit<Appointment, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date().toISOString()
  await appendRow('appointments!A:Q', [
    data.id, data.professionalId, data.professionalSlug,
    data.patientName, data.patientEmail, data.patientPhone,
    data.patientRut, data.reason, data.date, data.startTime,
    data.endTime, data.timezone, data.status,
    data.googleCalendarEventId, now, now,
  ])
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment['status']
): Promise<void> {
  const rows = await getSheetData('appointments!A:Q')
  const idx  = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (idx === -1) return
  const sheets = getSheetsClient()
  const now = new Date().toISOString()
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `appointments!M${idx + 1}`, values: [[status]] },
        { range: `appointments!P${idx + 1}`, values: [[now]] },
      ],
    },
  })
}

export async function isSlotTaken(
  professionalId: string,
  date: string,
  startTime: string
): Promise<boolean> {
  const existing = await getAppointmentsByDateAndProfessional(professionalId, date)
  return existing.some((a) => a.startTime === startTime)
}

