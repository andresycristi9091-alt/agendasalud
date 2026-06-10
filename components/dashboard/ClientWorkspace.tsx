'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'

type AvailabilityBlock = {
  id: string
  professionalId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  slotDuration: number
  active?: boolean | string
}

type Appointment = {
  id: string
  patientName: string
  patientEmail: string
  patientPhone: string
  date: string
  startTime: string
  endTime: string
  status: string
  reason: string
}

type Professional = {
  id: string
  slug: string
  name: string
  specialty: string
  professionalType: string
  photoUrl: string
  centerId?: string
}

type Me = {
  isAdmin: boolean
  user: { centerId?: string } | null
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miercoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
]

const DURATIONS = [15, 20, 30, 45, 60]

export function ClientWorkspace() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [day, setDay] = useState('monday')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('13:00')
  const [duration, setDuration] = useState(30)

  const selectedProfessional = professionals.find((professional) => professional.id === selectedProfessionalId)
  const publicLink = selectedProfessional
    ? `https://agendasalud.vercel.app/agendar/${selectedProfessional.slug}`
    : 'https://agendasalud.vercel.app/agendar'

  const refreshData = useCallback(async () => {
    if (!selectedProfessionalId) return

    const [appointmentsResponse, availabilityResponse] = await Promise.all([
      fetch(`/api/dashboard/appointments?professionalId=${selectedProfessionalId}`),
      fetch('/api/dashboard/availability'),
    ])

    const appointmentsData = await appointmentsResponse.json().catch(() => ({}))
    const availabilityData = await availabilityResponse.json().catch(() => ({}))

    setAppointments(appointmentsData.appointments ?? [])
    setAvailability(
      (availabilityData.availability ?? []).filter(
        (block: AvailabilityBlock) => block.professionalId === selectedProfessionalId
      )
    )
  }, [selectedProfessionalId])

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/me').then((response) => response.json()).catch(() => null),
      fetch('/api/dashboard/professionals').then((response) => response.json()),
    ])
      .then(([meData, professionalsData]) => {
        setMe(meData)
        const loaded = professionalsData.professionals ?? []
        setProfessionals(loaded)
        setSelectedProfessionalId(loaded[0]?.id ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProfessionalId) return
    const timer = window.setTimeout(() => {
      refreshData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshData, selectedProfessionalId])

  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function createAvailability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    startTransition(async () => {
      const response = await fetch('/api/dashboard/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: selectedProfessionalId,
          dayOfWeek: day,
          startTime,
          endTime,
          slotDuration: duration,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setMessage(data?.error ?? 'No pudimos guardar este bloque. Revisa las horas e intenta nuevamente.')
        return
      }

      setMessage('Horario publicado. Ya puede aparecer en el link publico del paciente.')
      await refreshData()
    })
  }

  async function deleteAvailability(id: string) {
    await fetch(`/api/dashboard/availability/${id}`, { method: 'DELETE' })
    setAvailability((current) => current.filter((item) => item.id !== id))
  }

  async function updateAppointment(id: string, status: string) {
    await fetch(`/api/dashboard/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setAppointments((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const activeAvailability = availability.filter((item) => String(item.active ?? 'TRUE').toUpperCase() !== 'FALSE')
  const metrics = useMemo(() => buildMetrics(appointments, activeAvailability), [appointments, activeAvailability])

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#1D4ED8_0%,#0891B2_52%,#10B981_100%)] p-6 text-white shadow-[0_24px_80px_rgba(37,99,235,0.20)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/85">
              {me?.isAdmin ? 'Panel NeuroPlus Admin' : 'Panel del centro'}
            </p>
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Gestiona profesionales, publica horarios y recibe reservas sin llamadas.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
              Selecciona un profesional de tu centro, abre disponibilidad y comparte su link publico con pacientes.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/12 p-4 backdrop-blur lg:min-w-[330px]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">Link del profesional</p>
            <p className="mt-2 break-all text-sm font-semibold text-white/90">{publicLink}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={copyPublicLink}
                className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-black text-blue-700 transition hover:-translate-y-0.5"
              >
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
              <a
                href={publicLink}
                target="_blank"
                className="rounded-2xl border border-white/25 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Ver
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-bold text-slate-500">{metric.label}</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{metric.value}</p>
            <p className="mt-2 text-sm leading-5 text-slate-400">{metric.help}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-800">Profesional</span>
              <select
                value={selectedProfessionalId}
                onChange={(event) => setSelectedProfessionalId(event.target.value)}
                className={inputClass}
                disabled={professionals.length === 0}
              >
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name} - {professional.professionalType || professional.specialty}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {me?.isAdmin
                ? 'Puedes editar foto, tipo de profesional, centro y permisos desde Admin.'
                : 'Solo se muestran profesionales asignados al centro de tu cuenta.'}
            </p>
          </div>

          {professionals.length === 0 && (
            <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Tu cuenta aun no tiene profesionales asignados. Solicita al administrador que asocie tu usuario a un centro activo.
            </div>
          )}

          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Publicar disponibilidad</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Abre horas para pacientes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Define bloques semanales. AgendaSalud genera automaticamente los cupos disponibles en hora chilena.
            </p>
          </div>

          <form onSubmit={createAvailability} className="space-y-4">
            <Field label="Dia">
              <select value={day} onChange={(event) => setDay(event.target.value)} className={inputClass}>
                {DAYS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio">
                <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Termino">
                <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClass} />
              </Field>
            </div>

            <Field label="Duracion por cita">
              <select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className={inputClass}>
                {DURATIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>{minutes} minutos</option>
                ))}
              </select>
            </Field>

            {message && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || professionals.length === 0}
              className="h-13 w-full rounded-2xl bg-[linear-gradient(135deg,#2563EB,#0891B2)] px-5 text-sm font-black text-white shadow-[0_16px_35px_rgba(37,99,235,0.20)] transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isPending ? 'Publicando...' : 'Publicar horario'}
            </button>
          </form>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Citas y bloques</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Operacion diaria</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Supervisa tus proximas reservas y los horarios que estan visibles para pacientes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshData()}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">Cargando operacion...</div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-black text-slate-800">Proximas citas</h3>
                <div className="space-y-3">
                  {appointments.length === 0 && <EmptyMini text="Aun no hay citas registradas." />}
                  {appointments.slice(0, 5).map((appointment) => (
                    <AppointmentRow key={appointment.id} appointment={appointment} onUpdate={updateAppointment} />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-black text-slate-800">Horarios activos</h3>
                <div className="space-y-3">
                  {activeAvailability.length === 0 && <EmptyMini text="Publica tu primer bloque para activar el link." />}
                  {activeAvailability.map((block) => (
                    <AvailabilityRow key={block.id} block={block} onDelete={deleteAvailability} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function AppointmentRow({ appointment, onUpdate }: { appointment: Appointment; onUpdate: (id: string, status: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-900">{appointment.patientName}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{appointment.date} · {appointment.startTime} - {appointment.endTime}</p>
          <p className="mt-1 text-xs text-slate-400">{appointment.patientEmail}</p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onUpdate(appointment.id, 'completada')} className="text-xs font-black text-blue-700 hover:text-blue-800">
          Completar
        </button>
        <button type="button" onClick={() => onUpdate(appointment.id, 'cancelada')} className="text-xs font-black text-red-600 hover:text-red-700">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function AvailabilityRow({ block, onDelete }: { block: AvailabilityBlock; onDelete: (id: string) => void }) {
  const day = DAYS.find((item) => item.key === block.dayOfWeek)?.label ?? block.dayOfWeek
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="font-black text-slate-900">{day}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{block.startTime} - {block.endTime} · {block.slotDuration} min</p>
      </div>
      <button type="button" onClick={() => onDelete(block.id)} className="text-xs font-black text-red-600 hover:text-red-700">
        Eliminar
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const label = status === 'no_asiste' ? 'No asiste' : status
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black capitalize text-emerald-700">
      {label}
    </span>
  )
}

function EmptyMini({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-400">{text}</div>
}

function buildMetrics(appointments: Appointment[], availability: AvailabilityBlock[]) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const todayAppointments = appointments.filter((appointment) => appointment.date === today)
  const confirmed = appointments.filter((appointment) => appointment.status === 'confirmada')

  return [
    { label: 'Citas hoy', value: String(todayAppointments.length), help: 'Reservas activas para la jornada.' },
    { label: 'Citas totales', value: String(appointments.length), help: 'Registros capturados desde el link publico.' },
    { label: 'Pendientes', value: String(confirmed.length), help: 'Citas confirmadas por atender.' },
    { label: 'Bloques activos', value: String(availability.length), help: 'Horarios publicados semanalmente.' },
  ]
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'
