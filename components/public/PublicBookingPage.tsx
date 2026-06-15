'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PublicTrustFooter } from './PublicTrustFooter'

type Professional = {
  id?: string
  slug: string
  name: string
  specialty: string
  centerName: string
  publicDescription: string
  professionalType?: string
  photoUrl?: string
}

type TimeSlot = {
  startTime: string
  endTime: string
  startISO: string
  endISO: string
  available: boolean
}

type Step = 'date' | 'slot' | 'form' | 'success'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function PublicBookingPage({ slug }: { slug: string }) {
  const [professional, setProfessional] = useState<Professional | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('date')
  const [selectedDate, setDate] = useState(() => getTodayISO())
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [selectedSlot, setSlot] = useState<TimeSlot | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [rut, setRut] = useState('')
  const [reason, setReason] = useState('')
  const [terms, setTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/public/professional/${slug}`)
      .then((response) => {
        if (!response.ok) {
          setNotFound(true)
          return null
        }
        return response.json()
      })
      .then((data) => {
        if (!cancelled && data) setProfessional(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError('No pudimos cargar este enlace de agendamiento.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  const loadSlots = useCallback(async (date: string, isCancelled: () => boolean = () => false) => {
    if (!date) return
    setLoadingSlots(true)
    setSlots([])
    setSlot(null)
    setSlotsError(null)

    fetch(`/api/public/availability/${slug}?date=${date}`)
      .then((response) => {
        if (!response.ok) throw new Error('availability')
        return response.json()
      })
      .then((data) => {
        if (!isCancelled()) setSlots(data.slots ?? [])
      })
      .catch(() => {
        if (!isCancelled()) setSlotsError('No pudimos cargar horarios para esta fecha.')
      })
      .finally(() => {
        if (!isCancelled()) setLoadingSlots(false)
      })
  }, [slug])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      loadSlots(selectedDate, () => cancelled)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [loadSlots, selectedDate])

  const [dateRange, setDateRange] = useState(21)
  const days = useMemo(() => getDaysToShow(dateRange), [dateRange])
  const availableSlots = slots.filter((slot) => slot.available)

  const [batchAvailability, setBatchAvailability] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!professional) return
    let cancelled = false
    const today = getTodayISO()
    const toDate = (() => {
      const d = parseISODate(today)
      d.setDate(d.getDate() + 29)
      return d.toISOString().split('T')[0]
    })()

    fetch(`/api/public/availability/batch/${slug}?from=${today}&to=${toDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.availability) setBatchAvailability(data.availability)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [professional, slug])
  const groupedSlots = groupSlots(availableSlots)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSlot) {
      setFormError('Selecciona un horario para continuar.')
      return
    }
    if (!terms) {
      setFormError('Debes aceptar el uso de datos para gestionar la cita.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const response = await fetch('/api/public/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professionalSlug: slug,
        patientName: name.trim(),
        patientEmail: email.trim(),
        patientPhone: phone.trim(),
        patientRut: rut.trim(),
        reason: reason.trim(),
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        acceptTerms: terms,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      setFormError(data?.error ?? 'No pudimos confirmar la cita. Intenta nuevamente.')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setStep('success')
  }

  if (loading) return <FullPageState title="Cargando agenda..." subtitle="Estamos preparando los horarios disponibles." />

  if (notFound || !professional) {
    return (
      <FullPageState
        title="Enlace no disponible"
        subtitle={loadError ?? 'El enlace de agendamiento no existe o ya no esta activo.'}
      />
    )
  }

  return (
    <main id="main-content" className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <AgendaSaludMark />
            <div>
              <p className="text-sm font-black tracking-tight">
                Neuro<span className="text-teal-500">Plus</span>
              </p>
              <p className="text-xs font-medium text-slate-400">Agenda profesional</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 sm:block">
            Datos protegidos
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-10">
        <div className="space-y-6">
          <Hero professional={professional} />

          {step !== 'success' && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6" aria-live="polite">
              <Progress step={step} />

              {step === 'date' && (
                <DateStep
                  days={days}
                  selectedDate={selectedDate}
                  availability={batchAvailability}
                  canLoadMore={dateRange < 60}
                  onLoadMore={() => setDateRange((r) => Math.min(r + 21, 60))}
                  onSelect={(date) => {
                    setDate(date)
                    setStep('slot')
                  }}
                />
              )}

              {step === 'slot' && (
                <SlotStep
                  date={selectedDate}
                  loading={loadingSlots}
                  error={slotsError}
                  groupedSlots={groupedSlots}
                  selectedSlot={selectedSlot}
                  onBack={() => setStep('date')}
                  onNextDate={() => setDate(addDaysISO(selectedDate, 1))}
                  onSelect={(slot) => {
                    setSlot(slot)
                    setStep('form')
                  }}
                />
              )}

              {step === 'form' && selectedSlot && (
                <FormStep
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                  name={name}
                  email={email}
                  phone={phone}
                  rut={rut}
                  reason={reason}
                  terms={terms}
                  submitting={submitting}
                  error={formError}
                  onBack={() => setStep('slot')}
                  onSubmit={handleSubmit}
                  setName={setName}
                  setEmail={setEmail}
                  setPhone={setPhone}
                  setRut={setRut}
                  setReason={setReason}
                  setTerms={setTerms}
                />
              )}
            </div>
          )}

          {step === 'success' && (
            <SuccessState selectedDate={selectedDate} selectedSlot={selectedSlot} professional={professional} />
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4">
            <BookingSummary
              professional={professional}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              availableCount={availableSlots.length}
            />
            <ServiceDetails professional={professional} />
            <TrustAndPolicy />
          </div>
        </aside>
      </section>

      <BookingFAQ />

      <PublicTrustFooter />
    </main>
  )
}

function Hero({ professional }: { professional: Professional }) {
  return (
    <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#1D4ED8_0%,#0891B2_52%,#10B981_100%)] p-6 text-white shadow-[0_24px_80px_rgba(37,99,235,0.22)] sm:p-8">
      <div className="mb-6 inline-flex rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur">
        NeuroPlus · Agenda en pocos pasos
      </div>
      <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
        Reserva una hora con {professional.name}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-white/82 sm:text-lg">
        Elige un horario disponible en hora chilena y confirma tus datos. NeuroPlus recibira tu solicitud automaticamente.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <TrustCard value="1" label="Elige una fecha" />
        <TrustCard value="2" label="Confirma horario" />
        <TrustCard value="3" label="Recibe confirmacion" />
      </div>

      <div className="mt-7 rounded-3xl border border-white/15 bg-white/12 p-4 backdrop-blur">
        <div className="flex items-start gap-4">
          <ProfessionalPhoto professional={professional} />
          <div>
            <p className="text-sm font-semibold text-white/70">{professional.centerName || 'NeuroPlus'}</p>
            <p className="mt-1 text-xl font-black">{professional.name}</p>
            <p className="text-sm text-white/78">{professional.professionalType || professional.specialty}</p>
            {professional.publicDescription && (
              <p className="mt-3 text-sm leading-6 text-white/70">{professional.publicDescription}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Progress({ step }: { step: Step }) {
  const items = [
    { id: 'date', label: 'Fecha' },
    { id: 'slot', label: 'Horario' },
    { id: 'form', label: 'Datos' },
  ] as const
  const activeIndex = items.findIndex((item) => item.id === step)

  return (
    <div className="mb-7" aria-label="Progreso del agendamiento">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item, index) => {
          const active = index === activeIndex
          const done = index < activeIndex
          return (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-black',
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400',
                ].join(' ')}
              >
                {done ? <CheckIcon /> : index + 1}
              </div>
              <span aria-current={active ? 'step' : undefined} className={active ? 'text-sm font-black text-slate-900' : 'text-sm font-semibold text-slate-400'}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DateStep({
  days,
  selectedDate,
  availability,
  canLoadMore,
  onLoadMore,
  onSelect,
}: {
  days: string[]
  selectedDate: string
  availability: Record<string, boolean>
  canLoadMore: boolean
  onLoadMore: () => void
  onSelect: (date: string) => void
}) {
  return (
    <section>
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Paso 1</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Selecciona una fecha</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Los dias con punto verde tienen horarios disponibles.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
        {days.map((date) => {
          const parsed = parseISODate(date)
          const selected = date === selectedDate
          const hasSlots = availability[date]
          const known = date in availability
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={selected}
              aria-label={`${formatReadableDate(date)}${hasSlots ? ', horarios disponibles' : ''}`}
              className={[
                'rounded-2xl border p-3 text-center transition focus:outline-none focus:ring-4 focus:ring-blue-500/15',
                selected
                  ? 'border-blue-600 bg-blue-600 text-white shadow-[0_16px_35px_rgba(37,99,235,0.22)]'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50',
              ].join(' ')}
            >
              <p className="text-xs font-bold opacity-70">{WEEKDAYS[parsed.getDay()]}</p>
              <p className="mt-1 text-2xl font-black">{parsed.getDate()}</p>
              <p className="text-xs font-bold opacity-70">{MONTHS[parsed.getMonth()]}</p>
              <div className="mt-1 flex justify-center">
                {known && hasSlots && (
                  <span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : 'bg-emerald-500'}`} aria-hidden="true" />
                )}
                {known && !hasSlots && (
                  <span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-white/40' : 'bg-slate-300'}`} aria-hidden="true" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {canLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="mt-4 w-full rounded-2xl border border-slate-200 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
        >
          Ver mas fechas
        </button>
      )}
    </section>
  )
}

function SlotStep({
  date,
  loading,
  error,
  groupedSlots,
  selectedSlot,
  onBack,
  onNextDate,
  onSelect,
}: {
  date: string
  loading: boolean
  error: string | null
  groupedSlots: ReturnType<typeof groupSlots>
  selectedSlot: TimeSlot | null
  onBack: () => void
  onNextDate: () => void
  onSelect: (slot: TimeSlot) => void
}) {
  const hasSlots = groupedSlots.manana.length + groupedSlots.tarde.length + groupedSlots.noche.length > 0

  return (
    <section>
      <button type="button" onClick={onBack} className="mb-5 text-sm font-black text-blue-700 hover:text-blue-800">
        Volver a fechas
      </button>

      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Paso 2</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Elige un horario</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{formatReadableDate(date)} - America/Santiago</p>
      </div>

      {loading && (
        <div aria-busy="true" aria-label="Cargando horarios disponibles">
          <SlotSkeleton />
        </div>
      )}
      {error && <EmptyState title={error} action="Intentar con otra fecha" onAction={onBack} />}
      {!loading && !error && !hasSlots && (
        <EmptyState
          title="No hay horarios disponibles para esta fecha."
          subtitle="Puedes revisar el dia siguiente o volver al calendario."
          action="Ver dia siguiente"
          onAction={onNextDate}
        />
      )}

      {!loading && !error && hasSlots && (
        <div className="space-y-5">
          <SlotGroup label="Manana" slots={groupedSlots.manana} selectedSlot={selectedSlot} onSelect={onSelect} />
          <SlotGroup label="Tarde" slots={groupedSlots.tarde} selectedSlot={selectedSlot} onSelect={onSelect} />
          <SlotGroup label="Noche" slots={groupedSlots.noche} selectedSlot={selectedSlot} onSelect={onSelect} />
        </div>
      )}
    </section>
  )
}

function SlotGroup({
  label,
  slots,
  selectedSlot,
  onSelect,
}: {
  label: string
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  onSelect: (slot: TimeSlot) => void
}) {
  if (slots.length === 0) return null

  return (
    <div>
      <p className="mb-2 text-sm font-black text-slate-700">{label}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot) => {
          const selected = selectedSlot?.startTime === slot.startTime
          return (
            <button
              key={`${slot.startTime}-${slot.endTime}`}
              type="button"
              onClick={() => onSelect(slot)}
              aria-pressed={selected}
              aria-label={`Seleccionar horario ${slot.startTime} a ${slot.endTime}`}
              className={[
                'h-12 rounded-2xl border px-3 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-blue-500/15',
                selected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:-translate-y-0.5 hover:bg-blue-100',
              ].join(' ')}
            >
              {slot.startTime}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FormStep({
  selectedDate,
  selectedSlot,
  name,
  email,
  phone,
  rut,
  reason,
  terms,
  submitting,
  error,
  onBack,
  onSubmit,
  setName,
  setEmail,
  setPhone,
  setRut,
  setReason,
  setTerms,
}: {
  selectedDate: string
  selectedSlot: TimeSlot
  name: string
  email: string
  phone: string
  rut: string
  reason: string
  terms: boolean
  submitting: boolean
  error: string | null
  onBack: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  setName: (value: string) => void
  setEmail: (value: string) => void
  setPhone: (value: string) => void
  setRut: (value: string) => void
  setReason: (value: string) => void
  setTerms: (value: boolean) => void
}) {
  const inputClass =
    'h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'

  return (
    <section>
      <button type="button" onClick={onBack} className="mb-5 text-sm font-black text-blue-700 hover:text-blue-800">
        Volver a horarios
      </button>

      <div className="mb-5 rounded-3xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Resumen</p>
        <p className="mt-1 text-sm font-black text-blue-950">{formatReadableDate(selectedDate)}</p>
        <p className="text-sm font-semibold text-blue-700">
          {selectedSlot.startTime} - {selectedSlot.endTime}
        </p>
      </div>

      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Paso 3</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Confirma tus datos</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          No pedimos datos clinicos sensibles en este formulario.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="patientName" className="mb-2 block text-sm font-black text-slate-800">
            Nombre completo
          </label>
          <input
            id="patientName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            placeholder="Ej: Maria Gonzalez"
            className={inputClass}
            autoComplete="name"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="patientEmail" className="mb-2 block text-sm font-black text-slate-800">
              Email
            </label>
            <input
              id="patientEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="correo@ejemplo.cl"
              className={inputClass}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="patientPhone" className="mb-2 block text-sm font-black text-slate-800">
              Telefono
            </label>
            <input
              id="patientPhone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              placeholder="+56 9 1234 5678"
              className={inputClass}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="patientRut" className="mb-2 block text-sm font-black text-slate-800">
              RUT opcional
            </label>
            <input
              id="patientRut"
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              placeholder="12.345.678-9"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="reason" className="mb-2 block text-sm font-black text-slate-800">
              Motivo opcional
            </label>
            <input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
              placeholder="Consulta general"
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm leading-6 text-slate-600">
            Acepto que mis datos sean utilizados unicamente para gestionar esta solicitud de agendamiento.
          </span>
        </label>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500">
          Tus datos se usaran solo para gestionar esta solicitud de agendamiento. No ingreses antecedentes clinicos sensibles en este formulario.
        </div>

        <button
          type="submit"
          disabled={submitting || !terms}
          className="group flex h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#0891B2_50%,#10B981_100%)] px-5 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(37,99,235,0.30)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Confirmando...' : 'Confirmar cita'}
          <span className="ml-2 transition group-hover:translate-x-1">-&gt;</span>
        </button>
      </form>
    </section>
  )
}

function BookingSummary({
  professional,
  selectedDate,
  selectedSlot,
  availableCount,
}: {
  professional: Professional
  selectedDate: string
  selectedSlot: TimeSlot | null
  availableCount: number
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Tu reserva</p>
      <div className="mt-4 space-y-4">
        <SummaryRow label="Centro" value={professional.centerName || 'NeuroPlus'} />
        <SummaryRow label="Profesional" value={professional.name} />
        <SummaryRow label="Tipo de atencion" value={professional.professionalType || professional.specialty} />
        <SummaryRow label="Fecha" value={formatReadableDate(selectedDate)} />
        <SummaryRow label="Horario" value={selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'Por elegir'} />
      </div>

      <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-black text-emerald-800">{availableCount} horarios disponibles</p>
        <p className="mt-1 text-xs leading-5 text-emerald-700">Confirmacion sujeta a disponibilidad al momento de reservar.</p>
      </div>
    </div>
  )
}

function ServiceDetails({ professional }: { professional: Professional }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Ficha de atencion</p>
      <div className="mt-4 space-y-4">
        <SummaryRow label="Servicio" value={`Consulta con ${professional.professionalType || professional.specialty}`} />
        <SummaryRow label="Modalidad" value="Presencial o segun indique el centro" />
        <SummaryRow label="Zona horaria" value="America/Santiago" />
        <SummaryRow label="Costo" value="Informado por el centro de salud" />
      </div>
      <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-800">
        Esta reserva no reemplaza una urgencia. Si tienes sintomas graves o riesgo vital, contacta servicios de emergencia.
      </p>
    </div>
  )
}

function TrustAndPolicy() {
  return (
    <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Confianza y privacidad</p>
      <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-emerald-900">
        <li className="flex gap-2"><CheckBullet /><span>Conexion segura HTTPS.</span></li>
        <li className="flex gap-2"><CheckBullet /><span>Datos usados solo para gestionar tu hora.</span></li>
        <li className="flex gap-2"><CheckBullet /><span>Confirmacion enviada al correo ingresado.</span></li>
        <li className="flex gap-2"><CheckBullet /><span>Para cambiar o cancelar, contacta al centro con los datos de confirmacion.</span></li>
      </ul>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10.4L8 14L16 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckBullet() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden="true">
      <CheckIcon />
    </span>
  )
}

function BookingFAQ() {
  const faqs = [
    {
      q: 'La hora queda confirmada inmediatamente?',
      a: 'Si el horario sigue disponible al confirmar, la cita queda registrada y el centro recibe la solicitud automaticamente.',
    },
    {
      q: 'Puedo reagendar o cancelar?',
      a: 'Si necesitas cambiar tu hora, usa la informacion enviada por correo o contacta directamente al centro.',
    },
    {
      q: 'Debo ingresar antecedentes clinicos?',
      a: 'No. En esta version solo pedimos datos de contacto y un motivo breve opcional.',
    },
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Preguntas frecuentes</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Antes de confirmar tu hora</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black text-slate-950">{faq.q}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}

function SuccessState({
  selectedDate,
  selectedSlot,
  professional,
}: {
  selectedDate: string
  selectedSlot: TimeSlot | null
  professional: Professional
}) {
  const calendarUrl = selectedSlot
    ? buildGoogleCalendarUrl({
        title:       `Cita con ${professional.name}`,
        description: `${professional.specialty} - ${professional.centerName || 'AgendaSalud'}`,
        date:        selectedDate,
        startTime:   selectedSlot.startTime,
        endTime:     selectedSlot.endTime,
      })
    : null

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)]" role="status">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-3xl font-black text-white">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-950">Tu cita fue agendada</h2>
      <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-500">
        Recibiras la confirmacion en tu correo electronico en los proximos minutos.
      </p>
      <div className="mx-auto mt-6 max-w-md rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-left">
        <SummaryRow label="Atencion" value={`${professional.name} - ${professional.specialty}`} />
        <div className="mt-4">
          <SummaryRow label="Fecha y hora" value={`${formatReadableDate(selectedDate)} · ${selectedSlot?.startTime ?? ''} - ${selectedSlot?.endTime ?? ''}`} />
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Que sigue ahora</p>
        <ol className="mt-3 space-y-3">
          <NextStepItem number="1" text="Revisa tu correo: te enviaremos la confirmacion con todos los detalles." />
          <NextStepItem number="2" text="Llega 10 minutos antes de tu hora con tu documento de identidad." />
          <NextStepItem number="3" text="Si necesitas cancelar o cambiar tu hora, responde el correo de confirmacion o contacta al centro." />
        </ol>
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Agregar a Google Calendar
          </a>
        )}
        <Link
          href="/agendar"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
        >
          Agendar otra hora
        </Link>
      </div>
    </div>
  )
}

function NextStepItem({ number, text }: { number: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{number}</span>
      <span className="text-sm leading-6 text-slate-600">{text}</span>
    </li>
  )
}

function buildGoogleCalendarUrl({
  title,
  description,
  date,
  startTime,
  endTime,
}: {
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
}): string {
  const toCalDate = (d: string, t: string) => `${d.replace(/-/g, '')}T${t.replace(':', '')}00`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: `${toCalDate(date, startTime)}/${toCalDate(date, endTime)}`,
    ctz: 'America/Santiago',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function TrustCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/14 p-4 backdrop-blur">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/75">{label}</p>
    </div>
  )
}

function ProfessionalPhoto({ professional }: { professional: Professional }) {
  if (professional.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={professional.photoUrl}
        alt={professional.name}
        className="h-20 w-20 shrink-0 rounded-3xl object-cover ring-4 ring-white/20"
      />
    )
  }

  const initials = professional.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/18 text-xl font-black text-white ring-4 ring-white/15">
      {initials || 'NP'}
    </div>
  )
}

function EmptyState({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string
  subtitle?: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-lg font-black text-slate-900">{title}</p>
      {subtitle && <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{subtitle}</p>}
      <button
        type="button"
        onClick={onAction}
        className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
      >
        {action}
      </button>
    </div>
  )
}

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  )
}

function FullPageState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-sm rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-4">
          <AgendaSaludMark />
        </div>
        <h1 className="text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
    </main>
  )
}

function AgendaSaludMark() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#10B981)] shadow-lg">
      <svg width="28" height="28" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <rect x="4" y="6" width="22" height="20" rx="5" fill="white" fillOpacity="0.96" />
        <path d="M9 5V9M21 5V9" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 16H20" stroke="#0891B2" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M15 11V21" stroke="#0891B2" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="23.5" cy="23.5" r="5.5" fill="#22C55E" />
        <path d="M21.2 23.5L22.8 25.1L26 21.8" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function getTodayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDaysToShow(amount: number) {
  const today = parseISODate(getTodayISO())
  return Array.from({ length: amount }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    return date.toISOString().split('T')[0]
  })
}

function addDaysISO(date: string, days: number) {
  const parsed = parseISODate(date)
  parsed.setDate(parsed.getDate() + days)
  return parsed.toISOString().split('T')[0]
}

function parseISODate(date: string) {
  return new Date(`${date}T12:00:00`)
}

function formatReadableDate(date: string) {
  const parsed = parseISODate(date)
  return `${WEEKDAYS[parsed.getDay()]} ${parsed.getDate()} ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`
}

function groupSlots(slots: TimeSlot[]) {
  return slots.reduce(
    (groups, slot) => {
      const hour = Number(slot.startTime.split(':')[0])
      if (hour < 12) groups.manana.push(slot)
      else if (hour < 18) groups.tarde.push(slot)
      else groups.noche.push(slot)
      return groups
    },
    { manana: [] as TimeSlot[], tarde: [] as TimeSlot[], noche: [] as TimeSlot[] }
  )
}
