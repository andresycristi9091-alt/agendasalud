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
  address: string
  city: string
  region: string
  phone: string
  email: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ManagedUser = {
  id: string
  email: string
  name: string
  passwordHash: string
  role: 'admin' | 'user'
  centerId: string
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

export type AppointmentStatus = 'confirmada' | 'cancelada' | 'completada' | 'no_asiste' | 'reagendada'

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
  status:               AppointmentStatus
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
export async function getProfessionalById(id: string): Promise<Professional | null> {
  const rows = await getSheetData('professionals!A:Q')
  if (rows.length < 2) return null
  const headers = rows[0]
  const found   = rows.slice(1).find((r) => r[0] === id)
  if (!found) return null
  return rowToProfessional(found, headers)
}

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
    address: row[5] ?? mapped.address ?? '',
    city: row[6] ?? mapped.city ?? '',
    region: row[7] ?? mapped.region ?? '',
    phone: row[8] ?? mapped.phone ?? '',
    email: row[9] ?? mapped.email ?? '',
    active: String(row[10] ?? mapped.active ?? 'TRUE').toUpperCase() === 'TRUE',
    createdAt: row[11] ?? mapped.createdAt ?? '',
    updatedAt: row[12] ?? mapped.updatedAt ?? '',
  }
}

export async function getAllCenters(): Promise<HealthCenter[]> {
  const rows = await getSheetData('centers!A:M').catch(() => [])
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).filter((r) => r[0]).map((row) => rowToCenter(headers, row))
}

export async function ensureDefaultCenter(): Promise<HealthCenter> {
  const centers = await getAllCenters()
  const existing = centers.find((center) => center.slug === 'neuroplus')
  if (existing) return existing

  const center = {
    id: 'center-neuroplus',
    name: 'NeuroPlus',
    slug: 'neuroplus',
    description: 'Centro NeuroPlus',
    logoUrl: '',
    address: '',
    city: '',
    region: '',
    phone: '',
    email: '',
    active: true,
  }

  await createCenter(center)
  return { ...center, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}

export async function createCenter(data: Omit<HealthCenter, 'createdAt' | 'updatedAt'>): Promise<void> {
  await ensureSheet('centers', ['id', 'name', 'slug', 'description', 'logoUrl', 'address', 'city', 'region', 'phone', 'email', 'active', 'createdAt', 'updatedAt'])
  const now = new Date().toISOString()
  await appendRow('centers!A:M', [
    data.id,
    data.name,
    data.slug,
    data.description,
    data.logoUrl,
    data.address,
    data.city,
    data.region,
    data.phone,
    data.email,
    data.active ? 'TRUE' : 'FALSE',
    now,
    now,
  ])
}

export async function updateCenter(id: string, data: Partial<HealthCenter>): Promise<void> {
  const rows = await getSheetData('centers!A:M')
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id)
  if (rowIndex === -1) throw new Error('Centro no encontrado')

  const current = rowToCenter(rows[0], rows[rowIndex])
  const updated = { ...current, ...data, id: current.id, updatedAt: new Date().toISOString() }
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `centers!A${rowIndex + 1}:M${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        updated.id,
        updated.name,
        updated.slug,
        updated.description,
        updated.logoUrl,
        updated.address,
        updated.city,
        updated.region,
        updated.phone,
        updated.email,
        updated.active ? 'TRUE' : 'FALSE',
        updated.createdAt,
        updated.updatedAt,
      ]],
    },
  })
}

function rowToManagedUser(headers: string[], row: string[]): ManagedUser {
  const mapped = rowToObject<Partial<ManagedUser>>(headers, row)
  return {
    id: row[0] ?? mapped.id ?? '',
    email: row[1] ?? mapped.email ?? '',
    name: row[2] ?? mapped.name ?? '',
    passwordHash: row[3] ?? mapped.passwordHash ?? '',
    role: ((row[4] ?? mapped.role ?? 'user') === 'admin' ? 'admin' : 'user'),
    centerId: row[5] ?? mapped.centerId ?? '',
    active: String(row[6] ?? mapped.active ?? 'TRUE').toUpperCase() === 'TRUE',
    createdAt: row[7] ?? mapped.createdAt ?? '',
    updatedAt: row[8] ?? mapped.updatedAt ?? '',
  }
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  await ensureSheet('users', ['id', 'email', 'name', 'passwordHash', 'role', 'centerId', 'active', 'createdAt', 'updatedAt'])
  const rows = await getSheetData('users!A:I')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).filter((row) => row[0]).map((row) => rowToManagedUser(headers, row))
}

export async function getManagedUserByEmail(email: string): Promise<ManagedUser | null> {
  const users = await getManagedUsers()
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.active) ?? null
}

export async function createManagedUser(data: Omit<ManagedUser, 'createdAt' | 'updatedAt'>): Promise<ManagedUser> {
  await ensureSheet('users', ['id', 'email', 'name', 'passwordHash', 'role', 'centerId', 'active', 'createdAt', 'updatedAt'])
  const now = new Date().toISOString()
  const user = { ...data, createdAt: now, updatedAt: now }
  await appendRow('users!A:I', [
    user.id,
    user.email,
    user.name,
    user.passwordHash,
    user.role,
    user.centerId,
    user.active ? 'TRUE' : 'FALSE',
    user.createdAt,
    user.updatedAt,
  ])
  return user
}

export async function updateManagedUser(id: string, data: Partial<ManagedUser>): Promise<ManagedUser> {
  const rows = await getSheetData('users!A:I')
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id)
  if (rowIndex === -1) throw new Error('Usuario no encontrado')

  const current = rowToManagedUser(rows[0], rows[rowIndex])
  const updated: ManagedUser = { ...current, ...data, id: current.id, updatedAt: new Date().toISOString() }
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `users!A${rowIndex + 1}:I${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        updated.id,
        updated.email,
        updated.name,
        updated.passwordHash,
        updated.role,
        updated.centerId,
        updated.active ? 'TRUE' : 'FALSE',
        updated.createdAt,
        updated.updatedAt,
      ]],
    },
  })
  return updated
}

export async function deleteManagedUser(id: string): Promise<void> {
  const rows = await getSheetData('users!A:I')
  const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === id)
  if (rowIndex === -1) throw new Error('Usuario no encontrado')

  const metadata = await getSheetsClient().spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheet = metadata.data.sheets?.find((item) => item.properties?.title === 'users')
  const sheetId = sheet?.properties?.sheetId
  if (sheetId === undefined) throw new Error('Hoja users no encontrada')

  await getSheetsClient().spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
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

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const rows = await getSheetData('appointments!A:Q')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1)
    .filter((r) => r[8] === date && r[12] !== 'cancelada')
    .map((r) => rowToObject<Appointment>(headers, r))
}

export async function getRemindersSent(): Promise<Array<{ appointmentId: string; type: string }>> {
  try {
    const rows = await getSheetData('remindersSent!A:D')
    if (rows.length < 2) return []
    return rows.slice(1).map((r) => ({ appointmentId: r[1] ?? '', type: r[2] ?? '' }))
  } catch {
    return []
  }
}

export async function logReminderSent(appointmentId: string, type: '24h' | '2h'): Promise<void> {
  const id = `${type}-${appointmentId}`
  const now = new Date().toISOString()
  await appendRow('remindersSent!A:D', [id, appointmentId, type, now])
}

export async function getAppointmentsByPatientEmail(email: string): Promise<Appointment[]> {
  const rows = await getSheetData('appointments!A:Q')
  if (rows.length < 2) return []
  const headers = rows[0]
  const normalizedEmail = email.trim().toLowerCase()
  return rows.slice(1)
    .filter((r) => (r[4] ?? '').trim().toLowerCase() === normalizedEmail)
    .map((r) => rowToObject<Appointment>(headers, r))
    .sort((a, b) => {
      const da = `${a.date}T${a.startTime}`
      const db = `${b.date}T${b.startTime}`
      return db.localeCompare(da)
    })
}
