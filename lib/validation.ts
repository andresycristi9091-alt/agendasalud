import { z } from 'zod'

export const StrongPasswordSchema = z.string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'La contrasena debe incluir al menos una mayuscula')
  .regex(/[0-9]/, 'La contrasena debe incluir al menos un numero')

export const AppointmentSchema = z.object({
  professionalSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  patientName:      z.string().min(2).max(100),
  patientEmail:     z.string().email().max(254),
  patientPhone:     z.string().min(8).max(20),
  patientRut:       z.string().max(12).optional().default(''),
  reason:           z.string().max(300).optional().default(''),
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => {
    const parsed = new Date(d)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return parsed >= today
  }, { message: 'La fecha debe ser hoy o posterior' }),
  startTime:        z.string().regex(/^\d{2}:\d{2}$/),
  endTime:          z.string().regex(/^\d{2}:\d{2}$/),
  acceptTerms:      z.boolean().refine((v) => v === true, {
    message: 'Debes aceptar los términos de uso',
  }),
}).refine((data) => data.startTime < data.endTime, {
  message: 'La hora de inicio debe ser anterior a la hora de termino',
  path: ['endTime'],
})

export const AvailabilitySchema = z.object({
  professionalId: z.string().min(1),
  dayOfWeek:      z.union([
    z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ]),
  startTime:      z.string().regex(/^\d{2}:\d{2}$/),
  endTime:        z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration:   z.coerce.number().int().min(10).max(120),
})

export const UpdateStatusSchema = z.object({
  status: z.enum(['confirmada','cancelada','completada','no_asiste','reagendada']),
})

export const AdminProfessionalSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  specialty: z.string().min(2).max(120),
  professionalType: z.string().max(120).optional().default(''),
  centerName: z.string().min(2).max(120).default('NeuroPlus'),
  email: z.string().email().optional().or(z.literal('')).default(''),
  phone: z.string().max(30).optional().default(''),
  calendarId: z.string().max(220).optional().default('').refine(
    (v) => !v || /^[a-zA-Z0-9._%+\-@]+$/.test(v),
    { message: 'Formato de Calendar ID invalido' }
  ),
  publicDescription: z.string().max(500).optional().default(''),
  appointmentDurationDefault: z.coerce.number().int().min(10).max(120).default(30),
  timezone: z.string().default('America/Santiago'),
  active: z.boolean().default(true),
  photoUrl: z.string().url().optional().or(z.literal('')).default(''),
  centerId: z.string().optional().default(''),
})

export const AdminUserCreateSchema = z.object({
  email: z.string().email(),
  password: StrongPasswordSchema,
  name: z.string().min(2).max(120),
  role: z.enum(['admin', 'user']),
  centerId: z.string().optional().default(''),
})

export const AdminUserUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
  name: z.string().min(2).max(120).optional(),
  password: StrongPasswordSchema.optional().or(z.literal('')),
  centerId: z.string().optional(),
  active: z.boolean().optional(),
})

export const AdminCenterSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().default(''),
  logoUrl: z.string().url().optional().or(z.literal('')).default(''),
  address: z.string().max(180).optional().default(''),
  city: z.string().max(100).optional().default(''),
  region: z.string().max(100).optional().default(''),
  phone: z.string().max(30).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  active: z.boolean().default(true),
})

export const ManualAppointmentSchema = z.object({
  professionalId: z.string().min(1),
  patientName: z.string().min(2).max(100),
  patientEmail: z.string().email().max(254),
  patientPhone: z.string().min(8).max(20),
  patientRut: z.string().max(12).optional().default(''),
  reason: z.string().max(300).optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}).refine((data) => data.startTime < data.endTime, {
  message: 'La hora de inicio debe ser anterior a la hora de termino',
  path: ['endTime'],
})

export type AppointmentInput  = z.infer<typeof AppointmentSchema>
export type AvailabilityInput = z.infer<typeof AvailabilitySchema>
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>
export type AdminProfessionalInput = z.infer<typeof AdminProfessionalSchema>
export type AdminUserCreateInput = z.infer<typeof AdminUserCreateSchema>
export type AdminUserUpdateInput = z.infer<typeof AdminUserUpdateSchema>
export type AdminCenterInput = z.infer<typeof AdminCenterSchema>
export type ManualAppointmentInput = z.infer<typeof ManualAppointmentSchema>
