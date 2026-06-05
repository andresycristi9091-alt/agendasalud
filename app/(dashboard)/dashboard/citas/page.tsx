'use client'

import { useEffect, useState } from 'react'

type Appointment = {
  id:                   string
  patientName:          string
  patientEmail:         string
  patientPhone:         string
  date:                 string
  startTime:            string
  endTime:              string
  status:               string
  reason:               string
  googleCalendarEventId: string
  createdAt:            string
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  confirmada: { bg: '#DCFCE7', color: '#166534', label: 'Confirmada'  },
  cancelada:  { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelada'   },
  completada: { bg: '#DBEAFE', color: '#1E40AF', label: 'Completada'  },
  no_asiste:  { bg: '#FEF9C3', color: '#854D0E', label: 'No asistió'  },
}

export default function CitasDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilter]       = useState('all')
  const [updating, setUpdating]         = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/appointments?professionalId=prof-001')
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpdateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch(`/api/dashboard/appointments/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    )
    setUpdating(null)
  }

  const filtered = filterStatus === 'all'
    ? appointments
    : appointments.filter((a) => a.status === filterStatus)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Citas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {appointments.length} cita{appointments.length !== 1 ? 's' : ''} registrada{appointments.length !== 1 ? 's' : ''}
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="confirmada">Confirmadas</option>
          <option value="cancelada">Canceladas</option>
          <option value="completada">Completadas</option>
          <option value="no_asiste">No asistió</option>
        </select>
      </div>

      {loading && (
        <div className="text-center py-16 text-slate-400">Cargando citas...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No hay citas para mostrar</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Paciente', 'Fecha', 'Hora', 'Estado', 'Motivo', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => {
                  const s = STATUS_STYLES[a.status] ?? STATUS_STYLES.confirmada
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{a.patientName}</p>
                        <p className="text-xs text-slate-400">{a.patientEmail}</p>
                        <p className="text-xs text-slate-400">{a.patientPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{a.date}</td>
                      <td className="px-4 py-3 text-slate-700 font-mono">{a.startTime} – {a.endTime}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-bold"
                          style={{ backgroundColor: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{a.reason || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {a.status !== 'completada' && (
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'completada')}
                              disabled={updating === a.id}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition disabled:opacity-50"
                            >
                              Completar
                            </button>
                          )}
                          {a.status !== 'cancelada' && (
                            <button
                              onClick={() => handleUpdateStatus(a.id, 'cancelada')}
                              disabled={updating === a.id}
                              className="text-xs text-red-500 hover:text-red-700 font-medium transition disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
