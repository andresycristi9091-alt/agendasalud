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
  professionalType?:         string
  photoUrl?:                 string
  centerId?:                 string
}

export type HealthCenter = {
  id: string
  name: string
  slug: string
  description: string
  logoUrl: string
  active: boolean
  createdAt: string
  updatedAt: string
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

function rowToProfessional(row: string[], headers?: string[]): Professional {
  const mapped = headers ? rowToObject<Partial<Professional>>(headers, row) : {}

  return {
    id: row[0] ?? mapped.id ?? '',
    slug: row[1] ?? mapped.slug ?? '',
    name: row[2] ?? mapped.name ?? '',
    specialty: row[3] ?? mapped.specialty ?? '',
    centerName: row[4] ?? mapped.centerName ?? '',
    email: row[5] ?? mapped.email ?? '',
    phone: row[6] ?? mapped.phone ?? '',
    calendarId: row[7] ?? mapped.calendarId ?? '',
    publicDescription: row[8] ?? mapped.publicDescription ?? '',
    appointmentDurationDefault: Number(row[9] ?? mapped.appointmentDurationDefault ?? 30),
    timezone: row[10] ?? mapped.timezone ?? 'America/Santiago',
    active: String(row[11] ?? mapped.active ?? 'TRUE').toUpperCase() === 'TRUE',
    createdAt: row[12] ?? mapped.createdAt ?? '',
    updatedAt: row[13] ?? mapped.updatedAt ?? '',
    professionalType: row[14] ?? mapped.professionalType ?? '',
    photoUrl: row[15] ?? mapped.photoUrl ?? '',
    centerId: row[16] ?? mapped.centerId ?? '',
  }
}

async function getSheetData(range: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  })
  return (res.data.values ?? []) as string[][]
}

async function ensureSheet(tabName: string, headers: string[]): Promise<void> {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const exists = meta.data.sheets?.some((sheet) => sheet.properties?.title === tabName)

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    })
  }

  const values = await getSheetData(`${tabName}!A1:${String.fromCharCode(64 + headers.length)}1`).catch(() => [])
  if (values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:${String.fromCharCode(64 + headers.length)}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
  }
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
  const rows = await getSheetData('professionals!A:Q')
  if (rows.length < 2) return null
  const headers = rows[0]
  const found   = rows.slice(1).find((r) => r[1] === slug && r[11]?.toUpperCase() === 'TRUE')
  if (!found) return null
  return rowToProfessional(found, headers)
}

export async function getAllProfessionals(): Promise<Professional[]> {
  const rows = await getSheetData('professionals!A:Q')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1)
    .filter((r) => r[11]?.toUpperCase() === 'TRUE')
    .map((r) => rowToProfessional(r, headers))
}

export async function getAllProfessionalsForAdmin(): Promise<Professional[]> {
  const rows = await getSheetData('professionals!A:Q')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1)
    .filter((r) => r[0])
    .map((r) => rowToProfessional(r, headers))
}

export async function createProfessional(data: Omit<Professional, 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date().toISOString()
  await appendRow('professionals!A:Q', [
    data.id,
    data.slug,
    data.name,
    data.specialty,
    data.centerName,
    data.email,
    data.phone,
    data.calendarId,
    data.publicDescription,
    String(data.appointmentDurationDefault || 30),
    data.timezone || 'America/Santiago',
    data.active ? 'TRUE' : 'FALSE',
    now,
    now,
    data.professionalType ?? '',
    data.photoUrl ?? '',
    data.centerId ?? '',
  ])
}

export async function updateProfessional(id: string, data: Partial<Professional>): Promise<void> {
  const rows = await getSheetData('professionals!A:Q')
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id)
  if (rowIndex === -1) throw new Error('Profesional no encontrado')

  const current = rowToProfessional(rows[rowIndex], rows[0])
  const updated: Professional = {
    ...current,
    ...data,
    id: current.id,
    updatedAt: new Date().toISOString(),
  }

  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `professionals!A${rowIndex + 1}:Q${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        updated.id,
        updated.slug,
        updated.name,
        updated.specialty,
        updated.centerName,
        updated.email,
        updated.phone,
        updated.calendarId,
        updated.publicDescription,
        String(updated.appointmentDurationDefault || 30),
        updated.timezone || 'America/Santiago',
        updated.active ? 'TRUE' : 'FALSE',
        updated.createdAt,
        updated.updatedAt,
        updated.professionalType ?? '',
        updated.photoUrl ?? '',
        updated.centerId ?? '',
      ]],
    },
  })
}

export async function deactivateProfessional(id: string): Promise<void> {
  await updateProfessional(id, { active: false })
}

function rowToCenter(headers: string[], row: string[]): HealthCenter {
  const mapped = rowToObject<Partial<HealthCenter>>(headers, row)
  return {
    id: row[0] ?? mapped.id ?? '',
    name: row[1] ?? mapped.name ?? '',
    slug: row[2] ?? mapped.slug ?? '',
    description: row[3] ?? mapped.description ?? '',
    logoUrl: row[4] ?? mapped.logoUrl ?? '',
    active: String(row[5] ?? mapped.active ?? 'TRUE').toUpperCase() === 'TRUE',
    createdAt: row[6] ?? mapped.createdAt ?? '',
    updatedAt: row[7] ?? mapped.updatedAt ?? '',
  }
}

export async function getAllCenters(): Promise<HealthCenter[]> {
  const rows = await getSheetData('centers!A:H').catch(() => [])
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).filter((r) => r[0]).map((row) => rowToCenter(headers, row))
}

export async function createCenter(data: Omit<HealthCenter, 'createdAt' | 'updatedAt'>): Promise<void> {
  await ensureSheet('centers', ['id', 'name', 'slug', 'description', 'logoUrl', 'active', 'createdAt', 'updatedAt'])
  const now = new Date().toISOString()
  await appendRow('centers!A:H', [
    data.id,
    data.name,
    data.slug,
    data.description,
    data.logoUrl,
    data.active ? 'TRUE' : 'FALSE',
    now,
    now,
  ])
}

export async function updateCenter(id: string, data: Partial<HealthCenter>): Promise<void> {
  const rows = await getSheetData('centers!A:H')
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id)
  if (rowIndex === -1) throw new Error('Centro no encontrado')

  const current = rowToCenter(rows[0], rows[rowIndex])
  const updated = { ...current, ...data, id: current.id, updatedAt: new Date().toISOString() }
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `centers!A${rowIndex + 1}:H${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        updated.id,
        updated.name,
        updated.slug,
        updated.description,
        updated.logoUrl,
        updated.active ? 'TRUE' : 'FALSE',
        updated.createdAt,
        updated.updatedAt,
      ]],
    },
  })
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

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const rows = await getSheetData('appointments!A:Q')
  if (rows.length < 2) return null
  const headers = rows[0]
  const row = rows.slice(1).find((r) => r[0] === id)
  return row ? rowToObject<Appointment>(headers, row) : null
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

