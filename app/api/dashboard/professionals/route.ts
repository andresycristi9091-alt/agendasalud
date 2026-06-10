import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { getAllowedProfessionals, requireProfessionalAccess } from '@/lib/auth/permissions'
import { updateProfessional } from '@/lib/google/sheets'
import { z } from 'zod'

const DashboardProfessionalSchema = z.object({
  professionalId: z.string().min(1),
  specialty: z.string().min(2).max(120),
  professionalType: z.string().max(120).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  phone: z.string().max(30).optional().default(''),
  calendarId: z.string().max(220).optional().default(''),
  publicDescription: z.string().max(500).optional().default(''),
  appointmentDurationDefault: z.coerce.number().int().refine((value) => [10, 15, 30, 45, 60].includes(value)),
  photoUrl: z.string().url().optional().or(z.literal('')).default(''),
})

export async function GET() {
  try {
    const { professionals } = await getAllowedProfessionals()

    return NextResponse.json({
      professionals: professionals
        .filter((professional) => professional.active)
        .map((professional) => ({
          id: professional.id,
          slug: professional.slug,
          name: professional.name,
          specialty: professional.specialty,
          professionalType: professional.professionalType || professional.specialty,
          photoUrl: professional.photoUrl || '',
          centerId: professional.centerId || '',
          centerName: professional.centerName || '',
          email: professional.email || '',
          phone: professional.phone || '',
          calendarId: professional.calendarId || '',
          publicDescription: professional.publicDescription || '',
          appointmentDurationDefault: professional.appointmentDurationDefault || 30,
        })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener profesionales'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const parsed = DashboardProfessionalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    await requireAdmin()
    const { professional } = await requireProfessionalAccess(parsed.data.professionalId)
    await updateProfessional(professional.id, {
      specialty: parsed.data.specialty,
      professionalType: parsed.data.professionalType,
      email: parsed.data.email,
      phone: parsed.data.phone,
      calendarId: parsed.data.calendarId,
      publicDescription: parsed.data.publicDescription,
      appointmentDurationDefault: parsed.data.appointmentDurationDefault,
      photoUrl: parsed.data.photoUrl,
    })

    return NextResponse.json({ message: 'Profesional actualizado' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al actualizar profesional'
    const status = message.includes('No autorizado') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
