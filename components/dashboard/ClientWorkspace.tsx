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
  email: string
  phone: string
  calendarId: string
  publicDescription: string
  appointmentDurationDefault: number
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

const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const DURATIONS = [10, 15, 30, 45, 60]
type SelectionMode = 'day' | 'week' | 'month'

const emptyProfileForm = {
  specialty: '',
  professionalType: '',
  photoUrl: '',
  email: '',
  phone: '',
  calendarId: '',
  publicDescription: '',
  appointmentDurationDefault: 30,
}

export function ClientWorkspace() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'info' | 'error'>('info')
  const [isPending, startTransition] = useTransition()
  const [profilePending, startProfileTransition] = useTransition()

  const [showAllAppointments, setShowAllAppointments] = useState(false)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('day')
  const [calendarMonth, setCalendarMonth] = useState(() => firstDayOfMonth(getTodayISO()))
  const [selectedDates, setSelectedDates] = useState<string[]>(() => [getTodayISO()])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('13:00')
  const [duration, setDuration] = useState(30)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)

  const selectedProfessional = professionals.find((professional) => professional.id === selectedProfessionalId)
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? '')
  const publicLink = selectedProfessional
    ? `${appOrigin}/agendar/${selectedProfessional.slug}`
    : `${appOrigin}/agendar`

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
        if (loaded[0]) setProfileForm(buildProfileForm(loaded[0]))
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
    setMessageTone('info')
    setMessage('Link copiado al portapapeles.')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function createAvailability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    startTransition(async () => {
      if (startTime >= endTime) {
        setMessageTone('error')
        setMessage('La hora de termino debe ser posterior a la hora de inicio.')
        return
      }

      if (selectedDates.length === 0) {
        setMessageTone('error')
        setMessage('Selecciona al menos una fecha en el calendario.')
        return
      }

      for (const date of selectedDates) {
        const response = await fetch('/api/dashboard/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            professionalId: selectedProfessionalId,
            dayOfWeek: date,
            startTime,
            endTime,
            slotDuration: duration,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          setMessageTone('error')
          setMessage(data?.error ?? `No pudimos guardar el bloque del ${formatDateLabel(date)}.`)
          return
        }
      }

      setMessageTone('info')
      setMessage(`${selectedDates.length} fecha${selectedDates.length === 1 ? '' : 's'} publicada${selectedDates.length === 1 ? '' : 's'}. Ya apareceran en el link publico del paciente.`)
      await refreshData()
    })
  }

  function updateProfessionalProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProfessionalId) return

    setMessage(null)
    startProfileTransition(async () => {
      const response = await fetch('/api/dashboard/professionals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: selectedProfessionalId,
          ...profileForm,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessageTone('error')
        setMessage(data.error ?? 'No pudimos guardar los datos del profesional.')
        return
      }

      setProfessionals((current) =>
        current.map((professional) =>
          professional.id === selectedProfessionalId
            ? { ...professional, ...profileForm }
            : professional
        )
      )
      setMessageTone('info')
      setMessage('Perfil del profesional actualizado. Los pacientes veran estos cambios en el link publico.')
    })
  }

  async function deleteAvailability(id: string) {
    try {
      const response = await fetch(`/api/dashboard/availability/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setMessageTone('error')
        setMessage(data?.error ?? 'No pudimos eliminar este bloque.')
        return
      }
      setAvailability((current) => current.filter((item) => item.id !== id))
    } catch {
      setMessageTone('error')
      setMessage('Error de red al eliminar el bloque.')
    }
  }

  async function updateAppointment(id: string, status: string) {
    try {
      const response = await fetch(`/api/dashboard/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setMessageTone('error')
        setMessage(data?.error ?? 'No pudimos actualizar el estado de la cita.')
        return
      }
      setAppointments((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    } catch {
      setMessageTone('error')
      setMessage('Error de red al actualizar la cita.')
    }
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

      <section className="grid gap-4 lg:grid-cols-4">
        <FunnelStep
          step="1"
          title="Perfil visible"
          text="Foto, tipo de profesional, especialidad y descripcion aparecen en la pagina publica."
          done={Boolean(selectedProfessional?.specialty)}
        />
        <FunnelStep
          step="2"
          title="Agenda publicada"
          text="Define bloques semanales y duracion: 10, 15, 30, 45 minutos o 1 hora."
          done={activeAvailability.length > 0}
        />
        <FunnelStep
          step="3"
          title="Link del paciente"
          text="Comparte el enlace publico para que el paciente elija profesional, dia y hora."
          done={Boolean(selectedProfessional?.slug)}
        />
        <FunnelStep
          step="4"
          title="Calendar conectado"
          text="Usa el correo del profesional o un Calendar ID compartido con la service account."
          done={Boolean(selectedProfessional?.calendarId || selectedProfessional?.email)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-800">Profesional</span>
              <select
                value={selectedProfessionalId}
                onChange={(event) => {
                  const nextId = event.target.value
                  setSelectedProfessionalId(nextId)
                  const nextProfessional = professionals.find((professional) => professional.id === nextId)
                  setProfileForm(nextProfessional ? buildProfileForm(nextProfessional) : emptyProfileForm)
                  setDuration(Number(nextProfessional?.appointmentDurationDefault || 30))
                }}
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

          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Perfil publico</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Datos visibles para pacientes</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ajusta especialidad, foto, descripcion, calendario y duracion base de la atencion.
              </p>
            </div>

            <form onSubmit={updateProfessionalProfile} className="space-y-4">
              <Field label="Tipo de profesional">
                <input value={profileForm.professionalType} onChange={(event) => setProfileForm((current) => ({ ...current, professionalType: event.target.value }))} className={inputClass} placeholder="Ej: Neurologo, Psicologa" />
              </Field>
              <Field label="Especialidad">
                <input value={profileForm.specialty} onChange={(event) => setProfileForm((current) => ({ ...current, specialty: event.target.value }))} className={inputClass} placeholder="Especialidad" required />
              </Field>
              <Field label="URL fotografia">
                <input value={profileForm.photoUrl} onChange={(event) => setProfileForm((current) => ({ ...current, photoUrl: event.target.value }))} className={inputClass} placeholder="https://..." />
              </Field>
              <Field label="Correo profesional">
                <input value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} placeholder="profesional@centro.cl" />
              </Field>
              <Field label="Telefono profesional">
                <input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} placeholder="+56 9 1234 5678" />
              </Field>
              <Field label="Calendario del profesional">
                <input value={profileForm.calendarId} onChange={(event) => setProfileForm((current) => ({ ...current, calendarId: event.target.value }))} className={inputClass} placeholder="correo@centro.cl o calendar@group.calendar.google.com" />
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Si queda vacio, AgendaSalud intentara calendarizar en el correo profesional. Ese calendario debe estar compartido con la cuenta service account de Google.
                </p>
              </Field>
              <Field label="Duracion base de atencion">
                <select value={profileForm.appointmentDurationDefault} onChange={(event) => setProfileForm((current) => ({ ...current, appointmentDurationDefault: Number(event.target.value) }))} className={inputClass}>
                  {DURATIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes === 60 ? '1 hora' : `${minutes} minutos`}</option>
                  ))}
                </select>
              </Field>
              <Field label="Descripcion publica">
                <textarea value={profileForm.publicDescription} onChange={(event) => setProfileForm((current) => ({ ...current, publicDescription: event.target.value }))} className={`${inputClass} min-h-24 py-3`} placeholder="Breve descripcion para pacientes" />
              </Field>
              <button
                type="submit"
                disabled={profilePending || professionals.length === 0}
                className="h-13 w-full rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {profilePending ? 'Guardando...' : 'Guardar perfil visible'}
              </button>
            </form>
          </div>

          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Publicar disponibilidad</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Abre horas para pacientes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Selecciona fechas en calendario por dia, semana o mes. AgendaSalud genera automaticamente los cupos disponibles en hora chilena.
            </p>
          </div>

          <form onSubmit={createAvailability} className="space-y-4">
            <CalendarAvailabilityPicker
              month={calendarMonth}
              selectedDates={selectedDates}
              selectionMode={selectionMode}
              onMonthChange={setCalendarMonth}
              onModeChange={setSelectionMode}
              onSelectionChange={setSelectedDates}
            />

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
                  <option key={minutes} value={minutes}>{minutes === 60 ? '1 hora' : `${minutes} minutos`}</option>
                ))}
              </select>
            </Field>

            {message && (
              <div
                role={messageTone === 'error' ? 'alert' : 'status'}
                className={[
                  'rounded-2xl border p-3 text-sm font-semibold',
                  messageTone === 'error'
                    ? 'border-red-100 bg-red-50 text-red-700'
                    : 'border-blue-100 bg-blue-50 text-blue-700',
                ].join(' ')}
              >
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
                  {(showAllAppointments ? appointments : appointments.slice(0, 5)).map((appointment) => (
                    <AppointmentRow key={appointment.id} appointment={appointment} onUpdate={updateAppointment} />
                  ))}
                  {appointments.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllAppointments((v) => !v)}
                      className="w-full rounded-2xl border border-slate-200 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                    >
                      {showAllAppointments ? 'Ver menos' : `Ver todas (${appointments.length})`}
                    </button>
                  )}
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

function CalendarAvailabilityPicker({
  month,
  selectedDates,
  selectionMode,
  onMonthChange,
  onModeChange,
  onSelectionChange,
}: {
  month: string
  selectedDates: string[]
  selectionMode: SelectionMode
  onMonthChange: (month: string) => void
  onModeChange: (mode: SelectionMode) => void
  onSelectionChange: (dates: string[]) => void
}) {
  const days = getCalendarGrid(month)
  const selected = new Set(selectedDates)
  const today = getTodayISO()

  function applySelection(date: string) {
    if (date < today) return

    const dates =
      selectionMode === 'day'
        ? [date]
        : selectionMode === 'week'
          ? getWeekDates(date).filter((item) => item >= today)
          : getMonthDates(date).filter((item) => item >= today)

    const next = new Set(selectionMode === 'day' ? selectedDates : [])
    const allSelected = dates.every((item) => next.has(item))

    dates.forEach((item) => {
      if (allSelected) next.delete(item)
      else next.add(item)
    })

    onSelectionChange(Array.from(next).sort())
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">Calendario de disponibilidad</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {selectedDates.length} fecha{selectedDates.length === 1 ? '' : 's'} seleccionada{selectedDates.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
          {[
            ['day', 'Dia'],
            ['week', 'Semana'],
            ['month', 'Mes'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onModeChange(key as SelectionMode)}
              className={[
                'rounded-xl px-3 py-2 text-xs font-black transition',
                selectionMode === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-500">
          ‹
        </button>
        <p className="text-sm font-black capitalize text-slate-950">{formatMonthLabel(month)}</p>
        <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-500">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((weekday) => (
          <div key={weekday} className="py-2 text-center text-[11px] font-black uppercase tracking-wide text-slate-400">
            {weekday}
          </div>
        ))}
        {days.map((day) => {
          const isCurrentMonth = day.startsWith(month.slice(0, 7))
          const isSelected = selected.has(day)
          const disabled = day < today

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => applySelection(day)}
              className={[
                'aspect-square rounded-2xl text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-blue-500/10',
                isSelected
                  ? 'bg-[linear-gradient(135deg,#2563EB,#14B8A6)] text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50',
                !isCurrentMonth ? 'opacity-40' : '',
                disabled ? 'cursor-not-allowed opacity-25 hover:bg-white' : '',
              ].join(' ')}
            >
              {Number(day.slice(8, 10))}
            </button>
          )
        })}
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedDates.slice(0, 8).map((date) => (
            <span key={date} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {formatDateLabel(date)}
            </span>
          ))}
          {selectedDates.length > 8 && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">
              +{selectedDates.length - 8} mas
            </span>
          )}
          <button type="button" onClick={() => onSelectionChange([])} className="rounded-full px-3 py-1 text-xs font-black text-red-600 hover:bg-red-50">
            Limpiar
          </button>
        </div>
      )}
    </div>
  )
}

function FunnelStep({ step, title, text, done }: { step: string; title: string; text: string; done: boolean }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#14B8A6)] text-sm font-black text-white">
          {step}
        </span>
        <span className={[
          'rounded-full border px-3 py-1 text-xs font-black',
          done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700',
        ].join(' ')}>
          {done ? 'Listo' : 'Pendiente'}
        </span>
      </div>
      <h3 className="text-base font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
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
  const day = block.dayOfWeek.match(/^\d{4}-\d{2}-\d{2}$/)
    ? formatDateLabel(block.dayOfWeek)
    : DAYS.find((item) => item.key === block.dayOfWeek)?.label ?? block.dayOfWeek
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
  const map: Record<string, { label: string; classes: string }> = {
    confirmada: { label: 'Confirmada', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    completada: { label: 'Completada', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    cancelada:  { label: 'Cancelada',  classes: 'bg-red-50 text-red-600 border-red-200' },
    no_asiste:  { label: 'No asiste',  classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  const config = map[status] ?? { label: status, classes: 'bg-slate-50 text-slate-500 border-slate-200' }
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${config.classes}`}>
      {config.label}
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

function buildProfileForm(professional: Professional) {
  return {
    specialty: professional.specialty ?? '',
    professionalType: professional.professionalType ?? '',
    photoUrl: professional.photoUrl ?? '',
    email: professional.email ?? '',
    phone: professional.phone ?? '',
    calendarId: professional.calendarId ?? '',
    publicDescription: professional.publicDescription ?? '',
    appointmentDurationDefault: Number(professional.appointmentDurationDefault || 30),
  }
}

function getTodayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function firstDayOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addMonths(date: string, amount: number) {
  const parsed = parseLocalDate(date)
  parsed.setMonth(parsed.getMonth() + amount)
  parsed.setDate(1)
  return toISODate(parsed)
}

function getCalendarGrid(month: string) {
  const first = parseLocalDate(firstDayOfMonth(month))
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return toISODate(day)
  })
}

function getWeekDates(date: string) {
  const parsed = parseLocalDate(date)
  const start = new Date(parsed)
  start.setDate(parsed.getDate() - parsed.getDay())

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return toISODate(day)
  })
}

function getMonthDates(date: string) {
  const parsed = parseLocalDate(date)
  const year = parsed.getFullYear()
  const month = parsed.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: lastDay }, (_, index) => toISODate(new Date(year, month, index + 1)))
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(parseLocalDate(date))
}

function formatMonthLabel(date: string) {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    month: 'long',
    year: 'numeric',
  }).format(parseLocalDate(date))
}
