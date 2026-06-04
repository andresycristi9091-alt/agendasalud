'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CitaConRelaciones, TipoCita, EstadoCita } from '@/lib/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function obtenerCitasDia(
  fecha: string
): Promise<ActionResult<CitaConRelaciones[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('citas')
    .select(`
      *,
      paciente:pacientes(*),
      medico:medicos(*, profile:profiles(*)),
      box:boxes(*)
    `)
    .gte('fecha_hora', `${fecha}T00:00:00`)
    .lte('fecha_hora', `${fecha}T23:59:59`)
    .order('fecha_hora')

  if (error) {
    console.error('[citas] obtenerCitasDia:', error.message)
    return { success: false, error: 'No se pudieron obtener las citas' }
  }
  return { success: true, data: data as CitaConRelaciones[] }
}

export async function crearCita(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()

  const paciente_id   = formData.get('paciente_id') as string
  const medico_id     = formData.get('medico_id') as string
  const box_id        = formData.get('box_id') as string | null
  const fecha_hora    = formData.get('fecha_hora') as string
  const tipo          = formData.get('tipo') as TipoCita
  const triage_motivo = formData.get('triage_motivo') as string | null

  if (!paciente_id || !medico_id || !fecha_hora || !tipo) {
    return { success: false, error: 'Faltan campos obligatorios' }
  }

  // Verificar conflicto de horario
  const { data: conflicto } = await supabase
    .from('citas')
    .select('id')
    .eq('medico_id', medico_id)
    .eq('fecha_hora', fecha_hora)
    .neq('estado', 'cancelada')
    .maybeSingle()

  if (conflicto) {
    return { success: false, error: 'Ya existe una cita en ese horario para ese médico' }
  }

  const { data, error } = await supabase
    .from('citas')
    .insert({
      paciente_id,
      medico_id,
      box_id: box_id || null,
      fecha_hora,
      tipo,
      canal: 'manual' as const,
      triage_motivo: triage_motivo || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[citas] crearCita:', error.message)
    return { success: false, error: 'No se pudo crear la cita' }
  }

  revalidatePath('/dashboard/agenda')
  return { success: true, data: { id: data.id } }
}

export async function cancelarCita(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('citas')
    .update({ estado: 'cancelada' as EstadoCita })
    .eq('id', id)

  if (error) {
    console.error('[citas] cancelarCita:', error.message)
    return { success: false, error: 'No se pudo cancelar la cita' }
  }

  revalidatePath('/dashboard/agenda')
  return { success: true, data: null }
}

export async function marcarNoShow(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('citas')
    .update({ estado: 'no_show' as EstadoCita })
    .eq('id', id)

  if (error) {
    console.error('[citas] marcarNoShow:', error.message)
    return { success: false, error: 'No se pudo actualizar la cita' }
  }

  revalidatePath('/dashboard/agenda')
  return { success: true, data: null }
}
