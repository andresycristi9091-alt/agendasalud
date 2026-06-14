'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

type AppointmentRow = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  reason: string
  professionalName: string
  specialty: string
  centerName: string
  professionalSlug: string
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} de ${MONTHS[Number(month) - 1]} ${year}`
}

function isUpcoming(date: string, startTime: string) {
  const dt = new Date(`${date}T${startTime}:00`)
  return dt > new Date()
}

const statusConfig: Record<string, { label: string; color: string }> = {
  confirmada: { label: 'Confirmada',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  cancelada:  { label: 'Cancelada',   color: 'text-red-700 bg-red-50 border-red-200' },
  completada: { label: 'Completada',  color: 'text-blue-700 bg-blue-50 border-blue-200' },
  no_asiste:  { label: 'No asistio',  color: 'text-orange-700 bg-orange-50 border-orange-200' },
  reagendada: { label: 'Reagendada',  color: 'text-purple-700 bg-purple-50 border-purple-200' },
}

export function MisCitasPage() {
  const [email, setEmail] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const response = await fetch('/api/public/appointments/by-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })

    setLoading(false)
    setSearched(true)

    if (!response.ok) {
      setError('No pudimos buscar tus citas. Intenta nuevamente.')
      return
    }

    const data = await response.json()
    setAppointments(data.appointments ?? [])
  }

  const upcoming = appointments.filter((a) => a.status === 'confirmada' && isUpcoming(a.date, a.startTime))
  const past = appointments.filter((a) => !upcoming.includes(a))

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-black text-slate-700">
            <AgendaLogo />
            Agenda<span className="text-teal-500">Salud</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Mis citas</h1>
          <p className="mt-2 text-slate-500">Ingresa tu correo para ver tus citas agendadas.</p>
        </div>

        <form onSubmit={handleSearch} className="mb-8 flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.cl"
            className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 shrink-0 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {searched && !loading && appointments.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-black text-slate-800">No encontramos citas</p>
            <p className="mt-1 text-sm text-slate-500">No hay citas asociadas al correo <strong>{email}</strong>.</p>
            <Link href="/agendar" className="mt-5 inline-block rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
              Agendar una hora
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-blue-700">Proximas citas</h2>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} appointment={a} />
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">Historial</h2>
            <div className="space-y-3">
              {past.map((a) => (
                <AppointmentCard key={a.id} appointment={a} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/agendar" className="text-sm font-semibold text-blue-600 hover:underline">
            Agendar una nueva hora
          </Link>
        </div>
      </div>
    </div>
  )
}

function AppointmentCard({ appointment: a }: { appointment: AppointmentRow }) {
  const st = statusConfig[a.status] ?? { label: a.status, color: 'text-slate-600 bg-slate-50 border-slate-200' }
  const upcoming = a.status === 'confirmada' && isUpcoming(a.date, a.startTime)

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm transition ${upcoming ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black text-slate-900">{a.professionalName || 'Profesional'}</p>
          <p className="text-xs text-slate-500">{a.specialty} &middot; {a.centerName}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${st.color}`}>{st.label}</span>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-bold text-slate-500">{formatDate(a.date)}</p>
        <p className="text-lg font-black text-slate-900">{a.startTime} &ndash; {a.endTime} hrs</p>
        {a.reason && <p className="mt-0.5 text-xs text-slate-400">Motivo: {a.reason}</p>}
      </div>

      {upcoming && (
        <div className="mt-3 flex gap-2">
          <Link
            href={`/agendar/${a.professionalSlug}`}
            className="flex-1 rounded-xl border border-blue-200 py-2 text-center text-xs font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Reagendar
          </Link>
          <Link
            href={`/cancelar/${a.id}`}
            className="flex-1 rounded-xl border border-red-100 py-2 text-center text-xs font-bold text-red-600 transition hover:bg-red-50"
          >
            Cancelar
          </Link>
        </div>
      )}
    </div>
  )
}

function AgendaLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="10" fill="url(#mc)" />
      <path d="M16 8v8l5 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="6" stroke="white" strokeWidth="2" fill="none" />
      <defs>
        <linearGradient id="mc" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
    </svg>
  )
}
