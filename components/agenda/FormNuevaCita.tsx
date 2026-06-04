'use client'

import { useState, useTransition } from 'react'
import { buscarPacientePorRut, crearPaciente } from '@/lib/actions/pacientes'
import { crearCita } from '@/lib/actions/citas'
import type { MedicoConNombre } from '@/lib/actions/medicos'
import type { Paciente } from '@/lib/types/database'
import { useRouter } from 'next/navigation'

type FormNuevaCitaProps = {
  medicos: MedicoConNombre[]
}

export function FormNuevaCita({ medicos }: FormNuevaCitaProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [paso, setPaso]     = useState<'paciente' | 'cita'>('paciente')
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [exito, setExito]   = useState(false)

  const inputClass =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  function handleBuscarPaciente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const buscarResult = await buscarPacientePorRut(fd.get('rut') as string)
      if (!buscarResult.success) { setError(buscarResult.error); return }

      if (buscarResult.data) {
        setPaciente(buscarResult.data)
        setPaso('cita')
      } else {
        const crearResult = await crearPaciente(fd)
        if (!crearResult.success) { setError(crearResult.error); return }
        setPaciente(crearResult.data)
        setPaso('cita')
      }
    })
  }

  function handleCrearCita(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.append('paciente_id', paciente!.id)

    startTransition(async () => {
      const result = await crearCita(fd)
      if (!result.success) { setError(result.error); return }
      setExito(true)
      setTimeout(() => router.push('/dashboard/agenda'), 1800)
    })
  }

  if (exito) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center">
        <p className="text-5xl mb-3">✅</p>
        <p className="font-semibold text-green-800 text-lg">¡Cita creada exitosamente!</p>
        <p className="text-sm text-green-600 mt-1">Redirigiendo a la agenda...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-6 space-y-6">
      {/* Pasos */}
      <div className="flex items-center gap-3 text-sm pb-4 border-b">
        <div className={`flex items-center gap-1.5 ${paso === 'paciente' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
            ${paso === 'paciente' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            1
          </span>
          Paciente
        </div>
        <span className="text-slate-200">──</span>
        <div className={`flex items-center gap-1.5 ${paso === 'cita' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
            ${paso === 'cita' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            2
          </span>
          Cita
        </div>
      </div>

      {/* Paso 1: Paciente */}
      {paso === 'paciente' && (
        <form onSubmit={handleBuscarPaciente} className="space-y-4">
          <p className="text-sm text-slate-500">
            Ingresa el RUT del paciente. Si no existe lo registramos automáticamente.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>RUT *</label>
              <input name="rut" required placeholder="12.345.678-9" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nombre *</label>
              <input name="nombre" required placeholder="María" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Apellido *</label>
              <input name="apellido" required placeholder="González" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Teléfono</label>
              <input name="telefono" placeholder="+56 9 8765 4321" className={inputClass} />
            </div>
          </div>
          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium
                       hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Buscando paciente...' : 'Continuar →'}
          </button>
        </form>
      )}

      {/* Paso 2: Cita */}
      {paso === 'cita' && paciente && (
        <form onSubmit={handleCrearCita} className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm">
            <span className="text-slate-500">Paciente: </span>
            <span className="font-semibold text-slate-900">
              {paciente.nombre} {paciente.apellido}
            </span>
            <span className="text-slate-400 ml-2">— {paciente.rut}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Médico *</label>
              <select name="medico_id" required className={inputClass}>
                <option value="">Seleccionar médico...</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.profile?.nombre ?? 'Sin nombre'} — {m.especialidad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo de atención *</label>
              <select name="tipo" required className={inputClass}>
                <option value="control">Control</option>
                <option value="urgente">Urgente</option>
                <option value="orientacion">Orientación</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Fecha y hora *</label>
              <input
                name="fecha_hora"
                type="datetime-local"
                required
                min={new Date().toISOString().slice(0, 16)}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Motivo de consulta</label>
              <textarea
                name="triage_motivo"
                rows={2}
                placeholder="Describe brevemente el motivo..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPaso('paciente')}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600
                         hover:bg-slate-50 transition-colors"
            >
              ← Volver
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium
                         hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creando cita...' : 'Crear cita ✓'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
