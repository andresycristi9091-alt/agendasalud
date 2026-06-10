import { getCurrentUserRole } from '@/lib/auth/admin'
import {
  getAllAvailability,
  getAllProfessionalsForAdmin,
  getAppointmentById,
  type Availability,
  type Appointment,
  type Professional,
} from '@/lib/google/sheets'

type AuthContext = Awaited<ReturnType<typeof getCurrentUserRole>>

function getUserCenterId(context: AuthContext) {
  const centerId = String(context.user?.user_metadata?.centerId ?? '').trim()
  if (centerId) return centerId

  // MVP NeuroPlus: usuarios operativos sin centro explicito quedan asociados
  // al centro base para evitar un panel vacio por configuracion incompleta.
  return process.env.DEFAULT_CENTER_ID || 'center-neuroplus'
}

export async function requireDashboardUser() {
  const context = await getCurrentUserRole()
  if (!context.user) throw new Error('No autorizado')
  return context
}

export async function getAllowedProfessionals(): Promise<{
  context: AuthContext
  professionals: Professional[]
}> {
  const context = await requireDashboardUser()
  const professionals = await getAllProfessionalsForAdmin()

  if (context.isAdmin) return { context, professionals }

  const centerId = getUserCenterId(context)
  if (!centerId) return { context, professionals: [] }

  return {
    context,
    professionals: professionals.filter(
      (professional) => professional.active && professional.centerId === centerId
    ),
  }
}

export async function requireProfessionalAccess(professionalId: string) {
  const { context, professionals } = await getAllowedProfessionals()
  const professional = professionals.find((item) => item.id === professionalId)

  if (!professional) throw new Error('No autorizado para este centro')

  return { context, professional }
}

export async function requireAvailabilityAccess(id: string): Promise<Availability> {
  await requireDashboardUser()
  const availability = (await getAllAvailability()).find((item) => item.id === id)
  if (!availability) throw new Error('Disponibilidad no encontrada')

  await requireProfessionalAccess(availability.professionalId)
  return availability
}

export async function requireAppointmentAccess(id: string): Promise<Appointment> {
  await requireDashboardUser()
  const appointment = await getAppointmentById(id)
  if (!appointment) throw new Error('Cita no encontrada')

  await requireProfessionalAccess(appointment.professionalId)
  return appointment
}
