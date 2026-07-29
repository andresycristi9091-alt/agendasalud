'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react'

type AuditEvent = {
  id: string
  timestamp: string
  actorEmail: string
  actorRole: string
  action: string
  entityType: string
  entityId: string
  details: string
  ip: string
}

const ENTITY_FILTERS = [
  { value: '', label: 'Todo' },
  { value: 'user', label: 'Usuarios' },
  { value: 'professional', label: 'Profesionales' },
  { value: 'center', label: 'Centros' },
  { value: 'appointment', label: 'Citas' },
  { value: 'availability', label: 'Horarios' },
  { value: 'availability_exception', label: 'Bloqueos' },
  { value: 'session', label: 'Accesos' },
]

const ACTION_LABELS: Record<string, string> = {
  create: 'Creacion',
  update: 'Edicion',
  delete: 'Eliminacion',
  deactivate: 'Desactivacion',
  status_change: 'Cambio de estado',
  login_failed: 'Login fallido',
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function AuditLogPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [entityType, setEntityType] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEvents = useCallback(async (filter: string) => {
    try {
      const query = filter ? `?entityType=${encodeURIComponent(filter)}&limit=100` : '?limit=100'
      const response = await fetch(`/api/admin/audit${query}`)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error ?? 'No se pudo cargar la actividad.')
        setEvents([])
        return
      }

      setError('')
      setEvents(data.events ?? [])
    } catch {
      setError('Error de conexion al cargar la actividad.')
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents(entityType)
  }, [loadEvents, entityType])

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Auditoria</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Actividad reciente</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Registro de acciones administrativas y cambios de agenda. Solo lectura.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadEvents(entityType)}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50"
        >
          Actualizar
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ENTITY_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setEntityType(filter.value)}
            className={[
              'rounded-full px-4 py-2 text-xs font-black transition',
              entityType === filter.value
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
          Cargando actividad...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
          Sin eventos registrados todavia.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">
                  {ACTION_LABELS[event.action] ?? event.action}
                  <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {ENTITY_FILTERS.find((filter) => filter.value === event.entityType)?.label ?? event.entityType}
                  </span>
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                  {event.actorEmail || 'sistema'} · {formatTimestamp(event.timestamp)}
                  {event.details ? ` · ${event.details}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
