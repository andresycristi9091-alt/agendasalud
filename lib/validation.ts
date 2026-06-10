import { z } from 'zod'

export const AppointmentSchema = z.object({
  professionalSlug: z.string().min(1),
  patientName:      z.string().min(2).max(100),
  patientEmail:     z.string().email(),
  patientPhone:     z.string().min(8).max(20),
  patientRut:       z.string().max(12).optional().default(''),
  reason:           z.string().max(300).optional().default(''),
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:        z.string().regex(/^\d{2}:\d{2}$/),
  endTime:          z.string().regex(/^\d{2}:\d{2}$/),
  acceptTerms:      z.boolean().refine((v) => v === true, {
    message: 'Debes aceptar los términos de uso',
  }),
})

export const AvailabilitySchema = z.object({
  professionalId: z.string().min(1),
  dayOfWeek:      z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
  startTime:      z.string().regex(/^\d{2}:\d{2}$/),
  endTime:        z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration:   z.coerce.number().int().min(10).max(120),
})

export const UpdateStatusSchema = z.object({
  status: z.enum(['confirmada','cancelada','completada','no_asiste']),
})

export const AdminProfessionalSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  specialty: z.string().min(2).max(120),
  professionalType: z.string().max(120).optional().default(''),
  centerName: z.string().min(2).max(120).default('NeuroPlus'),
  email: z.string().email().optional().or(z.literal('')).default(''),
  phone: z.string().max(30).optional().default(''),
  calendarId: z.string().max(220).optional().default(''),
  publicDescription: z.string().max(500).optional().default(''),
  appointmentDurationDefault: z.coerce.number().int().min(10).max(120).default(30),
  timezone: z.string().default('America/Santiago'),
  active: z.boolean().default(true),
  photoUrl: z.string().url().optional().or(z.literal('')).default(''),
  centerId: z.string().optional().default(''),
})

export const AdminUserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(120),
  role: z.enum(['admin', 'user']),
  centerId: z.string().optional().default(''),
})

export const AdminUserUpdateSchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  name: z.string().min(2).max(120).optional(),
  password: z.string().min(8).optional().or(z.literal('')),
  centerId: z.string().optional(),
})

export const AdminCenterSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().default(''),
  logoUrl: z.string().url().optional().or(z.literal('')).default(''),
  active: z.boolean().default(true),
})

export type AppointmentInput  = z.infer<typeof AppointmentSchema>
export type AvailabilityInput = z.infer<typeof AvailabilitySchema>
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>
export type AdminProfessionalInput = z.infer<typeof AdminProfessionalSchema>
export type AdminUserCreateInput = z.infer<typeof AdminUserCreateSchema>
export type AdminUserUpdateInput = z.infer<typeof AdminUserUpdateSchema>
export type AdminCenterInput = z.infer<typeof AdminCenterSchema>
