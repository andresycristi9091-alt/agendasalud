'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Centro, Box } from '@/lib/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function obtenerCentros(): Promise<ActionResult<Centro[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('centros')
    .select('*')
    .eq('activo', true)
    .order('created_at')

  if (error) {
    console.error('[setup] obtenerCentros:', error.message)
    return { success: false, error: 'No se pudieron obtener los centros' }
  }
  return { success: true, data: data as Centro[] }
}

export async function crearCentro(formData: FormData): Promise<ActionResult<Centro>> {
  const supabase = await createClient()

  const nombre   = formData.get('nombre') as string
  const comuna   = formData.get('comuna') as string
  const telefono = (formData.get('telefono') as string) || null

  if (!nombre || !comuna) {
    return { success: false, error: 'Nombre y comuna son obligatorios' }
  }

  const { data, error } = await supabase
    .from('centros')
    .insert({ nombre, comuna, telefono })
    .select()
    .single()

  if (error) {
    console.error('[setup] crearCentro:', error.message)
    return { success: false, error: 'No se pudo crear el centro' }
  }

  revalidatePath('/dashboard/configuracion')
  return { success: true, data: data as Centro }
}

export async function obtenerBoxes(centro_id: string): Promise<ActionResult<Box[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boxes')
    .select('*')
    .eq('centro_id', centro_id)
    .eq('activo', true)

  if (error) {
    console.error('[setup] obtenerBoxes:', error.message)
    return { success: false, error: 'No se pudieron obtener los boxes' }
  }
  return { success: true, data: data as Box[] }
}

export async function crearBox(formData: FormData): Promise<ActionResult<Box>> {
  const supabase = await createClient()

  const nombre    = formData.get('nombre') as string
  const centro_id = formData.get('centro_id') as string

  if (!nombre || !centro_id) {
    return { success: false, error: 'Nombre y centro son obligatorios' }
  }

  const { data, error } = await supabase
    .from('boxes')
    .insert({ nombre, centro_id })
    .select()
    .single()

  if (error) {
    console.error('[setup] crearBox:', error.message)
    return { success: false, error: 'No se pudo crear el box' }
  }

  revalidatePath('/dashboard/configuracion')
  return { success: true, data: data as Box }
}
