'use server'

import { createClient } from '@/lib/supabase/server'
import type { Medico, Profile } from '@/lib/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export type MedicoConNombre = Medico & { profile: Profile | null }

export async function obtenerMedicos(): Promise<ActionResult<MedicoConNombre[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('medicos')
    .select('*, profile:profiles(*)')
    .eq('activo', true)
    .order('created_at')

  if (error) {
    console.error('[medicos] obtenerMedicos:', error.message)
    return { success: false, error: 'No se pudieron obtener los médicos' }
  }
  return { success: true, data: data as MedicoConNombre[] }
}
