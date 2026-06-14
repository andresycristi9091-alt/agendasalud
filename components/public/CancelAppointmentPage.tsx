'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

type AppointmentDetail = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  patientName: string
  patientEmail: string
  reason: string
  professional: {
    name: string
    specialty: string
    centerName: string
  } | null
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} de ${MONTHS[Number(month) - 1]} de ${year}`
}

const statusLabel: Record<string, { label: string; color: string }> = {
  confirmada:  { label: 'Confirmada',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  cancelada:   { label: 'Cancelada',   color: 'text-red-700 bg-red-50 border-red-200' },
  completada:  { label: 'Completada',  color: 'text-blue-700 bg-blue-50 border-blue-200' },
  no_asiste:   { label: 'No asistio',  color: 'text-orange-700 bg-orange-50 border-orange-200' },
  reagendada:  { label: 'Reagendada',  color: 'text-purple-700 bg-purple-50 border-purple-200' },
}

export function CancelAppointmentPage({ appointmentId }: { appointmentId: string }) {
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [email, setEmail] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/public/appointments/${appointmentId}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((data) => { if (data) setAppointment(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [appointmentId])

  async function handleCancel(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setConfirming(true)

    const response = await fetch(`/api/public/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })

    setConfirming(false)

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? 'No pudimos procesar la cancelacion. Intenta nuevamente.')
      return
    }

    setCancelled(true)
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      </Shell>
    )
  }

  if (notFound || !appointment) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-xl font-black text-slate-900">Cita no encontrada</h1>
          <p className="mt-2 text-sm text-slate-500">El enlace puede haber expirado o la cita ya no existe.</p>
          <Link href="/agendar" className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
            Ver profesionales disponibles
          </Link>
        </div>
      </Shell>
    )
  }

  if (cancelled) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-emerald-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-xl font-black text-emerald-900">Cita cancelada</h1>
          <p className="mt-2 text-sm text-emerald-700">Tu cita fue cancelada correctamente. Recibirás una confirmación por correo.</p>
          <Link href="/agendar" className="mt-6 inline-block rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">
            Agendar nueva hora
          </Link>
        </div>
      </Shell>
    )
  }

  const alreadyCancelled = appointment.status === 'cancelada'
  const completed = appointment.status === 'completada'
  const canCancel = !alreadyCancelled && !completed
  const st = statusLabel[appointment.status] ?? { label: appointment.status, color: 'text-slate-600 bg-slate-50 border-slate-200' }

  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-slate-900">Cancelar cita</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresa tu correo para confirmar la cancelacion</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-black text-slate-900">{appointment.professional?.name ?? 'Profesional'}</p>
              <p className="text-sm text-slate-500">{appointment.professional?.specialty}</p>
              <p className="text-xs text-slate-400">{appointment.professional?.centerName}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${st.color}`}>{st.label}</span>
          </div>

          <div className="rounded-2xl bg-slate-50 px-5 py-4">
            <p className="text-sm font-black text-slate-800">{formatDate(appointment.date)}</p>
            <p className="text-xl font-black text-slate-900">{appointment.startTime} &ndash; {appointment.endTime} hrs</p>
            {appointment.reason && (
              <p className="mt-1 text-sm text-slate-500">Motivo: {appointment.reason}</p>
            )}
          </div>

          {alreadyCancelled && (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              Esta cita ya fue cancelada anteriormente.
            </div>
          )}

          {completed && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
              Esta cita ya fue completada y no se puede cancelar.
            </div>
          )}

          {canCancel && (
            <form onSubmit={handleCancel} className="mt-5 space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-800">Tu correo electronico</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`Ingresa ${appointment.patientEmail.slice(0, 3)}...`}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  required
                />
                <p className="mt-1.5 text-xs text-slate-400">Debe coincidir con el correo con el que agendaste</p>
              </label>
              <button
                type="submit"
                disabled={confirming}
                className="h-12 w-full rounded-2xl bg-red-600 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {confirming ? 'Cancelando...' : 'Confirmar cancelacion'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Si necesitas ayuda, contacta al centro directamente.{' '}
          <Link href="/agendar" className="font-semibold text-blue-600 hover:underline">
            Ver profesionales
          </Link>
        </p>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto mb-10 flex max-w-lg items-center gap-2">
        <Link href="/" className="flex items-center gap-2 text-sm font-black text-slate-700">
          <AgendaLogo />
          Agenda<span className="text-teal-500">Salud</span>
        </Link>
      </div>
      {children}
    </div>
  )
}

function AgendaLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="10" fill="url(#lg)" />
      <path d="M16 8v8l5 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="6" stroke="white" strokeWidth="2" fill="none" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
    </svg>
  )
}
