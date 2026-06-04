'use server'

import { createClient } from '@/lib/supabase/server'
import type { Paciente } from '@/lib/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function buscarPacientePorRut(
  rut: string
): Promise<ActionResult<Paciente | null>> {
  const supabase = await createClient()
  const rutLimpio = rut.replace(/\./g, '').toUpperCase()

  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('rut', rutLimpio)
    .maybeSingle()

  if (error) {
    console.error('[pacientes] buscarPorRut:', error.message)
    return { success: false, error: 'Error buscando paciente' }
  }

  return { success: true, data: data as Paciente | null }
}

export async function crearPaciente(
  formData: FormData
): Promise<ActionResult<Paciente>> {
  const supabase = await createClient()

  const rut      = (formData.get('rut') as string).replace(/\./g, '').toUpperCase()
  const nombre   = formData.get('nombre') as string
  const apellido = formData.get('apellido') as string
  const telefono = (formData.get('telefono') as string) || null

  if (!rut || !nombre || !apellido) {
    return { success: false, error: 'RUT, nombre y apellido son obligatorios' }
  }

  const { data, error } = await supabase
    .from('pacientes')
    .insert({ rut, nombre, apellido, telefono })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un paciente con ese RUT' }
    }
    console.error('[pacientes] crearPaciente:', error.message)
    return { success: false, error: 'No se pudo registrar el paciente' }
  }

  return { success: true, data: data as Paciente }
}
