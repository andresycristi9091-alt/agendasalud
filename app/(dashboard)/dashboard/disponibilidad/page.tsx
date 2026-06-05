'use client'

import { useState, useTransition } from 'react'

const DAYS = [
  { key: 'monday',    label: 'Lunes'     },
  { key: 'tuesday',   label: 'Martes'    },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves'    },
  { key: 'friday',    label: 'Viernes'   },
  { key: 'saturday',  label: 'Sábado'    },
  { key: 'sunday',    label: 'Domingo'   },
]

const DURATIONS = [15, 20, 30, 45, 60]

type AvailabilityBlock = {
  id:           string
  dayOfWeek:    string
  startTime:    string
  endTime:      string
  slotDuration: number
}

export default function DisponibilidadPage() {
  const [blocks, setBlocks]     = useState<AvailabilityBlock[]>([])
  const [isPending, start]      = useTransition()
  const [success, setSuccess]   = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  // Form state
  const [day, setDay]           = useState('monday')
  const [startTime, setStart]   = useState('09:00')
  const [endTime, setEnd]       = useState('13:00')
  const [duration, setDuration] = useState(30)

  // Cargar disponibilidad al montar
  useState(() => {
    fetch('/api/dashboard/availability')
      .then((r) => r.json())
      .then((d) => setBlocks(d.availability ?? []))
      .catch(() => {})
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    start(async () => {
      const res = await fetch('/api/dashboard/availability', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          professionalId: 'default',
          dayOfWeek:      day,
          startTime,
          endTime,
          slotDuration:   duration,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Error al guardar')
        return
      }
      setSuccess('Disponibilidad guardada correctamente')
      // Recargar
      const updated = await fetch('/api/dashboard/availability').then((r) => r.json())
      setBlocks(updated.availability ?? [])
    })
  }

  async function handleDelete(id: string) {
    await fetch(`/api/dashboard/availability/${id}`, { method: 'DELETE' })
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
          Disponibilidad
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Define los horarios en que recibes pacientes cada semana.
        </p>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
        <h2 className="font-bold text-slate-900 mb-5">Agregar bloque de disponibilidad</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Día de la semana</label>
            <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
              {DAYS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Duración por cita</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputClass}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutos</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Hora inicio</label>
            <input type="time" value={startTime} onChange={(e) => setStart(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Hora término</label>
            <input type="time" value={endTime} onChange={(e) => setEnd(e.target.value)} className={inputClass} required />
          </div>

          {error   && <p className="col-span-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          {success && <p className="col-span-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">✅ {success}</p>}

          <div className="col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-xl text-white font-bold text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563EB, #0891B2)' }}
            >
              {isPending ? 'Guardando...' : 'Agregar horario'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de bloques */}
      {blocks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
          <h2 className="font-bold text-slate-900 mb-4">Horarios configurados</h2>
          <div className="space-y-3">
            {blocks.filter((b: AvailabilityBlock & { active?: boolean | string }) => b.active !== false && b.active !== 'FALSE').map((b) => {
              const dayLabel = DAYS.find((d) => d.key === b.dayOfWeek)?.label ?? b.dayOfWeek
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
                >
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{dayLabel}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {b.startTime} – {b.endTime} · {b.slotDuration} min por cita
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition"
                  >
                    Eliminar
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
