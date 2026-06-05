'use client'

import { useState, useTransition } from 'react'
import { crearCentro, crearBox } from '@/lib/actions/setup'
import type { Centro } from '@/lib/types/database'
import type { MedicoConNombre } from '@/lib/actions/medicos'

type FormSetupProps = {
  centros: Centro[]
  medicos: MedicoConNombre[]
}

export function FormSetup({ centros, medicos }: FormSetupProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const inputClass =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass  = 'block text-sm font-medium text-slate-700 mb-1'
  const sectionClass = 'bg-white rounded-xl border p-5'

  function notify(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  function handleCrearCentro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await crearCentro(fd)
      if (!result.success) { setError(result.error); return }
      notify(`Centro "${result.data.nombre}" creado correctamente`)
      ;(e.target as HTMLFormElement).reset()
    })
  }

  function handleCrearBox(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await crearBox(fd)
      if (!result.success) { setError(result.error); return }
      notify(`Box "${result.data.nombre}" creado correctamente`)
      ;(e.target as HTMLFormElement).reset()
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-green-700 text-sm">
          ✅ {success}
        </div>
      )}

      {/* Centros existentes */}
      {centros.length > 0 && (
        <div className={sectionClass}>
          <h2 className="font-semibold text-slate-900 mb-4">Centros registrados</h2>
          <div className="divide-y">
            {centros.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.nombre}</p>
                  <p className="text-xs text-slate-400">{c.comuna}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Activo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crear centro */}
      <div className={sectionClass}>
        <h2 className="font-semibold text-slate-900 mb-4">
          {centros.length === 0 ? '1. Registrar el centro de salud' : 'Agregar nuevo centro'}
        </h2>
        <form onSubmit={handleCrearCentro} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Nombre del centro *</label>
            <input
              name="nombre"
              required
              placeholder="Ej: Centro de Salud Villa Los Aromos"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Comuna *</label>
            <input name="comuna" required placeholder="La Florida" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input name="telefono" placeholder="+56 2 1234 5678" className={inputClass} />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium
                         hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Guardando...' : 'Crear centro'}
            </button>
          </div>
        </form>
      </div>

      {/* Crear box */}
      {centros.length > 0 && (
        <div className={sectionClass}>
          <h2 className="font-semibold text-slate-900 mb-4">Agregar Box / Consultorio</h2>
          <form onSubmit={handleCrearBox} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Centro *</label>
              <select name="centro_id" required className={inputClass}>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nombre del box *</label>
              <input
                name="nombre"
                required
                placeholder="Box 1 / Urgencias"
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-medium
                           hover:bg-slate-900 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Guardando...' : 'Agregar box'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Médicos */}
      {medicos.length > 0 && (
        <div className={sectionClass}>
          <h2 className="font-semibold text-slate-900 mb-4">Médicos registrados</h2>
          <div className="divide-y">
            {medicos.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {m.profile?.nombre ?? 'Sin nombre'}
                  </p>
                  <p className="text-xs text-slate-400">{m.especialidad}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {medicos.length === 0 && centros.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-700">
          <p className="font-medium mb-1">⚠️ No hay médicos registrados</p>
          <p>
            Para poder crear citas necesitas agregar médicos. Por ahora, insértalos
            directamente en Supabase en la tabla <code className="bg-amber-100 px-1 rounded">medicos</code>.
            En la próxima fase agregaremos el formulario de médicos aquí.
          </p>
        </div>
      )}
    </div>
  )
}
