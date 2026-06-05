'use client'

import { useState, useEffect } from 'react'

type Professional = {
  slug:               string
  name:               string
  specialty:          string
  centerName:         string
  publicDescription:  string
}

type TimeSlot = {
  startTime: string
  endTime:   string
  startISO:  string
  endISO:    string
  available: boolean
}

type Step = 'date' | 'slot' | 'form' | 'success'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS   = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

export function PublicBookingPage({ slug }: { slug: string }) {
  const [professional, setProfessional] = useState<Professional | null>(null)
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)

  const [step, setStep]               = useState<Step>('date')
  const [selectedDate, setDate]       = useState('')
  const [slots, setSlots]             = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSlot]       = useState<TimeSlot | null>(null)

  // Form
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [rut, setRut]         = useState('')
  const [reason, setReason]   = useState('')
  const [terms, setTerms]     = useState(false)
  const [submitting, setSub]  = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/public/professional/${slug}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then((d) => d && setProfessional(d))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!selectedDate) return
    setLoadingSlots(true)
    setSlots([])
    setSlot(null)
    fetch(`/api/public/availability/${slug}?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot || !terms) return
    setSub(true)
    setFormError(null)

    const res = await fetch('/api/public/appointments', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        professionalSlug: slug,
        patientName:      name,
        patientEmail:     email,
        patientPhone:     phone,
        patientRut:       rut,
        reason,
        date:             selectedDate,
        startTime:        selectedSlot.startTime,
        endTime:          selectedSlot.endTime,
        acceptTerms:      terms,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setFormError(d.error ?? 'Error al agendar. Intenta de nuevo.')
      setSub(false)
      return
    }

    setStep('success')
  }

  // Generar días del mes actual + siguiente
  function getDaysToShow(): string[] {
    const today  = new Date()
    const days: string[] = []
    for (let i = 0; i < 30; i++) {
      const d    = new Date(today)
      d.setDate(today.getDate() + i)
      const iso  = d.toISOString().split('T')[0]
      days.push(iso)
    }
    return days
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-3">⏳</div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (notFound || !professional) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-slate-900">Profesional no encontrado</h1>
          <p className="text-slate-500 mt-2">El enlace de agendamiento no es válido.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #2563EB, #10B981)' }}
          >
            AS
          </div>
          <div>
            <p className="font-black text-slate-900 text-sm">
              Agenda<span style={{ color: '#14B8A6' }}>Salud</span>
            </p>
            <p className="text-xs text-slate-400">Agendamiento en línea</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">

        {/* Info profesional */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, #2563EB, #0891B2)', color: 'white' }}
        >
          <p className="text-sm font-semibold text-white/70 mb-1">{professional.centerName}</p>
          <h1 className="text-2xl font-black tracking-tight">{professional.name}</h1>
          <p className="text-white/80 text-sm mt-1">{professional.specialty}</p>
          {professional.publicDescription && (
            <p className="text-white/70 text-sm mt-3">{professional.publicDescription}</p>
          )}
        </div>

        {/* Pasos */}
        {step !== 'success' && (
          <div className="flex items-center gap-2 mb-6 text-sm">
            {[
              { s: 'date', n: 1, label: 'Fecha'    },
              { s: 'slot', n: 2, label: 'Horario'  },
              { s: 'form', n: 3, label: 'Datos'    },
            ].map((item) => {
              const active  = item.s === step
              const done    = (step === 'slot' && item.s === 'date') ||
                              (step === 'form' && ['date','slot'].includes(item.s))
              return (
                <div key={item.s} className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: done ? '#22C55E' : active ? '#2563EB' : '#E2E8F0',
                      color:      done || active ? 'white' : '#94A3B8',
                    }}
                  >
                    {done ? '✓' : item.n}
                  </div>
                  <span className={active ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                    {item.label}
                  </span>
                  {item.n < 3 && <span className="text-slate-200 mx-1">—</span>}
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>

          {/* STEP 1: Seleccionar fecha */}
          {step === 'date' && (
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-1">
                Agenda tu hora médica en pocos pasos
              </h2>
              <p className="text-slate-500 text-sm mb-5">
                Elige un horario disponible y confirma tus datos.
              </p>
              <p className="text-sm font-semibold text-slate-700 mb-3">Selecciona una fecha:</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {getDaysToShow().map((dateStr) => {
                  const d      = new Date(dateStr + 'T12:00:00')
                  const isSelected = dateStr === selectedDate
                  return (
                    <button
                      key={dateStr}
                      onClick={() => { setDate(dateStr); setStep('slot') }}
                      className="rounded-xl p-2 text-center transition text-sm"
                      style={{
                        background:  isSelected ? 'linear-gradient(135deg, #2563EB, #0891B2)' : '#F8FAFC',
                        color:       isSelected ? 'white' : '#0F172A',
                        border:      `1.5px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`,
                        fontWeight:  isSelected ? 700 : 400,
                      }}
                    >
                      <p className="text-xs opacity-70">{WEEKDAYS[d.getDay()]}</p>
                      <p className="font-bold text-sm">{d.getDate()}</p>
                      <p className="text-xs opacity-60">{MONTHS[d.getMonth()].slice(0,3)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Seleccionar horario */}
          {step === 'slot' && (
            <div>
              <button
                onClick={() => setStep('date')}
                className="text-sm text-blue-600 font-medium mb-4 flex items-center gap-1"
              >
                ← Cambiar fecha
              </button>
              <h2 className="text-lg font-black text-slate-900 mb-1">
                Horarios disponibles
              </h2>
              <p className="text-slate-500 text-sm mb-5">
                {selectedDate} · Elige un horario
              </p>

              {loadingSlots && <p className="text-slate-400 text-sm">Cargando horarios...</p>}

              {!loadingSlots && slots.filter((s) => s.available).length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-3xl mb-2">📅</p>
                  <p className="text-sm">No hay horarios disponibles para esta fecha.</p>
                  <p className="text-xs mt-1">Intenta con otro día.</p>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.filter((s) => s.available).map((slot) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime
                  return (
                    <button
                      key={slot.startTime}
                      onClick={() => { setSlot(slot); setStep('form') }}
                      className="rounded-xl py-2.5 px-3 text-sm font-bold transition"
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, #2563EB, #0891B2)' : '#EFF6FF',
                        color:      isSelected ? 'white' : '#2563EB',
                        border:     `1.5px solid ${isSelected ? '#2563EB' : '#BFDBFE'}`,
                      }}
                    >
                      {slot.startTime}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Formulario paciente */}
          {step === 'form' && selectedSlot && (
            <div>
              <button
                onClick={() => setStep('slot')}
                className="text-sm text-blue-600 font-medium mb-4 flex items-center gap-1"
              >
                ← Cambiar horario
              </button>

              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5"
                style={{ backgroundColor: '#EFF6FF', border: '1.5px solid #BFDBFE' }}
              >
                <span className="text-2xl">📅</span>
                <div>
                  <p className="font-bold text-blue-900 text-sm">{selectedDate}</p>
                  <p className="text-blue-700 text-xs">{selectedSlot.startTime} – {selectedSlot.endTime}</p>
                </div>
              </div>

              <h2 className="text-lg font-black text-slate-900 mb-4">Tus datos</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre completo *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="María González" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="correo@ejemplo.cl" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono *</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+56 9 1234 5678" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">RUT (opcional)</label>
                    <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Motivo (opcional)</label>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Consulta general" className={inputClass} />
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-1 rounded"
                  />
                  <span className="text-xs text-slate-500 leading-relaxed">
                    Acepto que mis datos sean utilizados únicamente para gestionar esta solicitud de agendamiento.
                  </span>
                </label>

                {formError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    ⚠ {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !terms}
                  className="w-full h-14 rounded-2xl text-white font-black text-base transition
                             disabled:opacity-50 disabled:cursor-not-allowed
                             hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background:  'linear-gradient(135deg, #2563EB 0%, #0891B2 50%, #10B981 100%)',
                    boxShadow:   '0 12px 30px rgba(37,99,235,0.20)',
                  }}
                >
                  {submitting ? 'Confirmando cita...' : 'Confirmar cita →'}
                </button>
              </form>
            </div>
          )}

          {/* STEP: Éxito */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
              >
                ✓
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">¡Cita agendada!</h2>
              <p className="text-slate-500 leading-relaxed max-w-sm mx-auto">
                Tu cita fue agendada correctamente. Recibirás la información de confirmación
                en tu correo o por el medio definido por el centro de salud.
              </p>
              <div
                className="mt-6 rounded-2xl px-5 py-4 text-sm font-medium"
                style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1.5px solid #BBF7D0' }}
              >
                📅 {selectedDate} · {selectedSlot?.startTime} – {selectedSlot?.endTime}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Agendamiento seguro · AgendaSalud 🇨🇱
        </p>
      </main>
    </div>
  )
}
