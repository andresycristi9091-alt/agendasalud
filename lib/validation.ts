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

export type AppointmentInput  = z.infer<typeof AppointmentSchema>
export type AvailabilityInput = z.infer<typeof AvailabilitySchema>
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>
