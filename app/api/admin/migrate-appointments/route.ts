import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getAllAppointments } from '@/lib/google/sheets'
import { isPostgresBookingEnabled } from '@/lib/data/appointments'
import { importAppointmentToPostgres } from '@/lib/db/booking'
import { getRequestIp, logAuditEvent } from '@/lib/audit'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^\d{2}:\d{2}$/

// Backfill unico: copia las citas historicas de Google Sheets a Postgres.
// Idempotente: las filas ya importadas se saltan por id.
export async function POST(req: Request) {
  try {
    const adminContext = await requireAdmin()

    if (!isPostgresBookingEnabled()) {
      return NextResponse.json(
        {
          error:
            'Backend Postgres no activo. Ejecuta la migracion SQL en Supabase y define BOOKING_BACKEND=postgres y SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 400 }
      )
    }

    const appointments = await getAllAppointments()

    let imported = 0
    let alreadyExists = 0
    const conflicts: string[] = []
    const invalid: string[] = []
    const failures: string[] = []

    for (const appointment of appointments) {
      const isValid =
        UUID_PATTERN.test(appointment.id) &&
        DATE_PATTERN.test(appointment.date) &&
        TIME_PATTERN.test(appointment.startTime) &&
        TIME_PATTERN.test(appointment.endTime)

      if (!isValid) {
        invalid.push(appointment.id || '(sin id)')
        continue
      }

      try {
        const result = await importAppointmentToPostgres(appointment)
        if (result === 'imported') imported += 1
        else if (result === 'exists') alreadyExists += 1
        else conflicts.push(`${appointment.id} (${appointment.date} ${appointment.startTime})`)
      } catch (error) {
        failures.push(`${appointment.id}: ${error instanceof Error ? error.message : 'error'}`)
      }
    }

    logAuditEvent({
      actorEmail: adminContext.user?.email ?? '',
      actorRole: adminContext.role,
      action: 'create',
      entityType: 'appointment',
      entityId: 'backfill-sheets-postgres',
      details: {
        total: appointments.length,
        imported,
        alreadyExists,
        conflicts: conflicts.length,
        invalid: invalid.length,
        failures: failures.length,
      },
      ip: getRequestIp(req),
    })

    return NextResponse.json({
      message: `Backfill terminado: ${imported} importadas, ${alreadyExists} ya existian.`,
      total: appointments.length,
      imported,
      alreadyExists,
      // Solapamientos entre citas activas historicas: requieren resolucion humana.
      conflicts: conflicts.slice(0, 20),
      invalid: invalid.slice(0, 20),
      failures: failures.slice(0, 20),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error en el backfill'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
