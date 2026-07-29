'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react'

type ExceptionScope = 'professional' | 'center' | 'all'

type AvailabilityException = {
  id: string
  scope: ExceptionScope
  scopeId: string
  date: string
  startTime: string
  endTime: string
  reason: string
}

type ScopeOption = {
  id: string
  name: string
}

type Props = {
  professionalId?: string
  isAdmin?: boolean
  professionals?: ScopeOption[]
  centers?: ScopeOption[]
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'

function formatExceptionDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}-${month}-${year}`
}

export function AvailabilityExceptionsPanel({ professionalId, isAdmin = false, professionals = [], centers = [] }: Props) {
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState('')

  const [scope, setScope] = useState<ExceptionScope>(isAdmin ? 'all' : 'professional')
  const [scopeId, setScopeId] = useState('')
  const [date, setDate] = useState('')
  const [isFullDay, setIsFullDay] = useState(true)
  const [startTime, setStartTime] = useState('13:00')
  const [endTime, setEndTime] = useState('15:00')
  const [reason, setReason] = useState('')

  const loadExceptions = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/availability/exceptions')
      const data = await response.json().catch(() => ({}))
      setExceptions(data.exceptions ?? [])
    } catch {
      setExceptions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadExceptions()
  }, [loadExceptions])

  const visibleExceptions = exceptions
    .filter((exception) => {
      if (isAdmin) return true
      if (!professionalId) return false
      if (exception.scope === 'professional') return exception.scopeId === professionalId
      return true
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  function canDelete(exception: AvailabilityException): boolean {
    if (isAdmin) return true
    return exception.scope === 'professional' && exception.scopeId === professionalId
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)

    const payloadScope: ExceptionScope = isAdmin ? scope : 'professional'
    const payloadScopeId =
      payloadScope === 'all' ? '' : payloadScope === 'professional' && !isAdmin ? (professionalId ?? '') : scopeId

    if (payloadScope !== 'all' && !payloadScopeId) {
      setFeedback({ tone: 'error', text: 'Selecciona a quien aplica el bloqueo.' })
      return
    }
    if (!date) {
      setFeedback({ tone: 'error', text: 'Selecciona la fecha a bloquear.' })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/dashboard/availability/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: payloadScope,
          scopeId: payloadScopeId,
          date,
          startTime: isFullDay ? '' : startTime,
          endTime: isFullDay ? '' : endTime,
          reason: reason.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setFeedback({ tone: 'error', text: data.error ?? 'No se pudo crear el bloqueo.' })
        return
      }

      setFeedback({ tone: 'info', text: 'Bloqueo creado. Los pacientes ya no veran esas horas.' })
      setReason('')
      setDate('')
      await loadExceptions()
    } catch {
      setFeedback({ tone: 'error', text: 'Error de conexion al crear el bloqueo.' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLoadHolidays(year: number) {
    setFeedback(null)
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setFeedback({ tone: 'error', text: data.error ?? 'No se pudieron cargar los feriados.' })
        return
      }

      setFeedback({ tone: 'info', text: data.message ?? 'Feriados cargados.' })
      await loadExceptions()
    } catch {
      setFeedback({ tone: 'error', text: 'Error de conexion al cargar feriados.' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setFeedback(null)
    try {
      const response = await fetch(`/api/dashboard/availability/exceptions/${id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setFeedback({ tone: 'error', text: data.error ?? 'No se pudo eliminar el bloqueo.' })
        return
      }

      setExceptions((current) => current.filter((exception) => exception.id !== id))
    } catch {
      setFeedback({ tone: 'error', text: 'Error de conexion al eliminar el bloqueo.' })
    } finally {
      setConfirmDeleteId('')
    }
  }

  function describeScope(exception: AvailabilityException): string {
    if (exception.scope === 'all') return 'Todos los centros'
    if (exception.scope === 'center') {
      return centers.find((center) => center.id === exception.scopeId)?.name ?? 'Centro'
    }
    return professionals.find((professional) => professional.id === exception.scopeId)?.name ?? 'Profesional'
  }

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Bloqueos y feriados</p>
      <h3 className="mt-2 text-lg font-black text-slate-950">Dias sin atencion</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Bloquea fechas puntuales (feriados, vacaciones, licencias) sin borrar tus horarios publicados.
      </p>

      <form onSubmit={handleCreate} className="mt-4 space-y-3">
        {isAdmin && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-700">Aplica a</span>
              <select
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value as ExceptionScope)
                  setScopeId('')
                }}
                className={inputClass}
              >
                <option value="all">Todos (feriado global)</option>
                <option value="center">Un centro</option>
                <option value="professional">Un profesional</option>
              </select>
            </label>
            {scope !== 'all' && (
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-700">
                  {scope === 'center' ? 'Centro' : 'Profesional'}
                </span>
                <select value={scopeId} onChange={(event) => setScopeId(event.target.value)} className={inputClass}>
                  <option value="">Selecciona...</option>
                  {(scope === 'center' ? centers : professionals).map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-700">Fecha</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-700">Motivo (opcional)</span>
            <input
              type="text"
              value={reason}
              maxLength={200}
              placeholder="Feriado, vacaciones, congreso..."
              onChange={(event) => setReason(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={isFullDay}
            onChange={(event) => setIsFullDay(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Bloquear el dia completo
        </label>

        {!isFullDay && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-700">Desde</span>
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-700">Hasta</span>
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClass} />
            </label>
          </div>
        )}

        {feedback && (
          <div
            role={feedback.tone === 'error' ? 'alert' : 'status'}
            className={[
              'rounded-2xl border p-3 text-sm font-semibold',
              feedback.tone === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700',
            ].join(' ')}
          >
            {feedback.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving || (!isAdmin && !professionalId)}
          className="h-12 w-full rounded-2xl bg-amber-500 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(245,158,11,0.28)] transition hover:-translate-y-0.5 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Crear bloqueo'}
        </button>
      </form>

      {isAdmin && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-3">
          <p className="text-xs font-bold text-slate-600">Carga rapida:</p>
          {[2026, 2027].map((year) => (
            <button
              key={year}
              type="button"
              disabled={isSaving}
              onClick={() => handleLoadHolidays(year)}
              className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
            >
              Feriados de Chile {year}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-2">
        <h4 className="text-sm font-black text-slate-800">Bloqueos vigentes</h4>
        {isLoading && <p className="text-sm font-semibold text-slate-400">Cargando bloqueos...</p>}
        {!isLoading && visibleExceptions.length === 0 && (
          <p className="rounded-2xl border border-dashed border-amber-200 bg-white px-4 py-3 text-sm text-slate-400">
            No hay bloqueos registrados.
          </p>
        )}
        {visibleExceptions.map((exception) => (
          <div
            key={exception.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-black text-slate-900">
                {formatExceptionDate(exception.date)}
                <span className="ml-2 text-xs font-bold text-slate-500">
                  {exception.startTime && exception.endTime
                    ? `${exception.startTime} - ${exception.endTime}`
                    : 'Dia completo'}
                </span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {describeScope(exception)}
                {exception.reason ? ` · ${exception.reason}` : ''}
              </p>
            </div>
            {canDelete(exception) && (
              confirmDeleteId === exception.id ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(exception.id)}
                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId('')}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(exception.id)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50"
                >
                  Eliminar
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
