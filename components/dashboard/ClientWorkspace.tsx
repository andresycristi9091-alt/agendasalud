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
  user: { email?: string; centerId?: string } | null
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

const emptyManualForm = {
  patientName: '',
  patientEmail: '',
  patientPhone: '',
  patientRut: '',
  reason: '',
  date: getTodayISO(),
  startTime: '09:00',
  endTime: '09:30',
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
  const [manualForm, setManualForm] = useState(emptyManualForm)
  const [workDate, setWorkDate] = useState(getTodayISO())

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
        if (loaded[0]) setProfileForm(buildProfileForm(loaded[0], meData?.user?.email))
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
    const block = availability.find((item) => item.id === id)
    const label = block ? `${block.dayOfWeek} ${block.startTime}-${block.endTime}` : 'este bloque'
    if (!window.confirm(`Eliminar el bloque ${label}? Los pacientes ya no podran reservar en esas horas.`)) return
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
    if (status === 'cancelada') {
      const appointment = appointments.find((item) => item.id === id)
      const label = appointment ? `de ${appointment.patientName} (${appointment.date} ${appointment.startTime})` : 'seleccionada'
      if (!window.confirm(`Cancelar la cita ${label}? Esta accion notifica el cambio de estado.`)) return
    }
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
  const workdayAppointments = useMemo(
    () => appointments
      .filter((appointment) => appointment.date === workDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments, workDate]
  )
  const nextAppointment = workdayAppointments.find((appointment) => appointment.status === 'confirmada') ?? workdayAppointments[0]
  const dailyInsights = useMemo(() => buildDailyInsights(workdayAppointments), [workdayAppointments])
  const canEditPublicProfile = Boolean(me?.isAdmin)

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#1D4ED8_0%,#0891B2_52%,#10B981_100%)] p-6 text-white shadow-[0_24px_80px_rgba(37,99,235,0.20)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/85">
              {me?.isAdmin ? 'Vista profesional administrable' : 'Dashboard profesional'}
            </p>
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              {selectedProfessional
                ? `Hola, ${selectedProfessional.name.split(' ')[0]}. Tu jornada en un solo lugar.`
                : 'Tu agenda, pacientes y horarios en un solo lugar.'}
            </h1>
            {selectedProfessional && (
              <p className="mt-2 text-sm font-bold text-white/70">
                {selectedProfessional.professionalType || selectedProfessional.specialty}
                {selectedProfessional.specialty && selectedProfessional.professionalType && selectedProfessional.professionalType !== selectedProfessional.specialty
                  ? ` · ${selectedProfessional.specialty}`
                  : ''}
              </p>
            )}
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
              Revisa la jornada, habilita horas, crea citas manuales y mantén el estado de cada paciente actualizado sin salir del panel.
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

      <ProfessionalModuleGrid
        publicLink={publicLink}
        copied={copied}
        onCopy={copyPublicLink}
        stats={{
          today: workdayAppointments.length,
          pending: workdayAppointments.filter((appointment) => appointment.status === 'confirmada').length,
          availability: activeAvailability.length,
        }}
        canEditPublicProfile={canEditPublicProfile}
      />

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <ProfessionalTodayPanel
          workDate={workDate}
          onDateChange={setWorkDate}
          appointments={workdayAppointments}
          nextAppointment={nextAppointment}
          insights={dailyInsights}
          onUpdate={updateAppointment}
        />
        <QuickActionPanel
          publicLink={publicLink}
          copied={copied}
          onCopy={copyPublicLink}
          selectedProfessional={selectedProfessional}
          canEditPublicProfile={canEditPublicProfile}
        />
      </section>

      <section id="estadisticas" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-bold text-slate-500">{metric.label}</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{metric.value}</p>
            <p className="mt-2 text-sm leading-5 text-slate-400">{metric.help}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div id="perfil" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-800">Profesional</span>
              <select
                value={selectedProfessionalId}
                onChange={(event) => {
                  const nextId = event.target.value
                  setSelectedProfessionalId(nextId)
                  const nextProfessional = professionals.find((professional) => professional.id === nextId)
                  setProfileForm(nextProfessional ? buildProfileForm(nextProfessional, me?.user?.email) : emptyProfileForm)
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

          {canEditPublicProfile ? (
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
          ) : (
            <PublicProfileLockedCard professional={selectedProfessional} publicLink={publicLink} />
          )}

          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Publicar disponibilidad</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Abre horas para pacientes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Selecciona fechas en calendario por dia, semana o mes. AgendaSalud genera automaticamente los cupos disponibles en hora chilena.
            </p>
          </div>

          <form id="disponibilidad" onSubmit={createAvailability} className="space-y-4">
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

        <div id="agenda" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
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

              <div className="xl:col-span-2">
                <ManualAppointmentForm
                  form={manualForm}
                  disabled={!selectedProfessionalId}
                  onChange={setManualForm}
                  onSubmit={createManualAppointment}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold leading-5 text-slate-500">
            Los datos de pacientes que ves aqui son confidenciales. Usalos solo para gestionar la atencion y no los
            compartas fuera de la plataforma (Ley 19.628 sobre proteccion de datos personales).
          </p>
          <span className="inline-flex w-fit flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Datos protegidos
          </span>
        </div>
      </section>
    </div>
  )

  function createManualAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProfessionalId) return

    setMessage(null)
    startTransition(async () => {
      const response = await fetch('/api/dashboard/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: selectedProfessionalId,
          ...manualForm,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessageTone('error')
        setMessage(data.error ?? 'No pudimos crear la cita manual.')
        return
      }

      setMessageTone('info')
      setMessage('Cita manual creada y enviada al calendario del profesional.')
      setManualForm(emptyManualForm)
      await refreshData()
    })
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function PublicProfileLockedCard({ professional, publicLink }: { professional?: Professional; publicLink?: string }) {
  return (
    <div className="mb-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Tu ficha publica</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Como te ven los pacientes</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Vista de solo lectura. Para cambiar foto, especialidad o descripcion, contacta al administrador del centro.
        </p>
      </div>

      {professional ? (
        <>
          <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <ProfessionalAvatar professional={professional} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-slate-950">{professional.name}</p>
              <p className="text-sm font-semibold text-teal-700">{professional.professionalType || professional.specialty}</p>
              {professional.professionalType && professional.specialty && professional.professionalType !== professional.specialty && (
                <p className="text-xs text-slate-400">{professional.specialty}</p>
              )}
            </div>
          </div>

          {professional.publicDescription && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Descripcion</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{professional.publicDescription}</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileInfoChip label="Correo" value={professional.email || 'No configurado'} empty={!professional.email} />
            <ProfileInfoChip label="Telefono" value={professional.phone || 'No configurado'} empty={!professional.phone} />
            <ProfileInfoChip
              label="Duracion base"
              value={professional.appointmentDurationDefault ? `${professional.appointmentDurationDefault} min por cita` : '30 min por cita'}
            />
            <ProfileInfoChip
              label="Calendario"
              value={professional.calendarId ? 'Conectado' : 'Usando correo profesional'}
              green={Boolean(professional.calendarId)}
            />
          </div>

          {publicLink && (
            <a
              href={publicLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 text-sm font-black text-teal-700 transition hover:bg-teal-100"
            >
              Ver mi perfil publico
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          Solicita al administrador que asigne un profesional a tu cuenta para ver tu ficha publica.
        </div>
      )}
    </div>
  )
}

function ProfessionalAvatar({ professional, size = 'md' }: { professional: Professional; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-16 w-16 text-base' : 'h-10 w-10 text-xs'
  if (professional.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={professional.photoUrl} alt={professional.name} className={`${dim} flex-shrink-0 rounded-2xl object-cover`} />
  }
  return (
    <div className={`${dim} flex flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#14B8A6)] font-black text-white`}>
      {professional.name.slice(0, 2).toUpperCase() || 'NP'}
    </div>
  )
}

function ProfileInfoChip({ label, value, empty = false, green = false }: { label: string; value: string; empty?: boolean; green?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${green ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${green ? 'text-emerald-700' : empty ? 'text-slate-400' : 'text-slate-700'}`}>{value}</p>
    </div>
  )
}

function ProfessionalModuleGrid({
  publicLink,
  copied,
  onCopy,
  stats,
  canEditPublicProfile,
}: {
  publicLink: string
  copied: boolean
  onCopy: () => void
  stats: { today: number; pending: number; availability: number }
  canEditPublicProfile: boolean
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Centro de trabajo</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Que quieres gestionar ahora?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Accesos rapidos para operar la agenda profesional sin buscar en menus.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
          {stats.today} citas hoy - {stats.pending} pendientes
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ModuleCard
          href="#agenda"
          icon="calendar"
          title="Agenda diaria"
          description="Revisa pacientes del dia, estados y proximo turno."
          meta={`${stats.today} citas hoy`}
        />
        <ModuleCard
          href="#disponibilidad"
          icon="clock"
          title="Habilitar horarios"
          description="Selecciona fechas, semanas o meses para abrir cupos."
          meta={`${stats.availability} bloques activos`}
        />
        <ModuleCard
          href="#agenda"
          icon="plus"
          title="Crear cita manual"
          description="Agenda una hora tomada por telefono o recepcion."
          meta="Registro interno"
        />
        <ModuleCard
          href="#estadisticas"
          icon="chart"
          title="Estadisticas"
          description="Atendidos, pendientes, no asiste y actividad diaria."
          meta="Vista operativa"
        />
        {canEditPublicProfile ? (
          <ModuleCard
            href="#perfil"
            icon="user"
            title="Perfil publico"
            description="Edita foto, especialidad, descripcion y calendario."
            meta="Solo Admin"
          />
        ) : (
          <ModuleCard
            href="#perfil"
            icon="user"
            title="Mi ficha publica"
            description="Ve como apareces ante los pacientes. Solo lectura."
            meta="Gestionado por Admin"
          />
        )}
        <button
          type="button"
          onClick={onCopy}
          className="group rounded-[26px] border border-blue-100 bg-blue-50 p-5 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-100/70 hover:shadow-[0_16px_38px_rgba(37,99,235,0.12)]"
        >
          <Icon name="link" />
          <div className="mt-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Link para clientes</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{publicLink}</p>
            </div>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">{copied ? 'Copiado' : 'Copiar'}</span>
          </div>
        </button>
      </div>
    </section>
  )
}

function ModuleCard({
  href,
  icon,
  title,
  description,
  meta,
}: {
  href: string
  icon: IconName
  title: string
  description: string
  meta: string
}) {
  return (
    <a
      href={href}
      className="group rounded-[26px] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-teal-200 hover:bg-teal-50 hover:shadow-[0_16px_38px_rgba(20,184,166,0.12)]"
    >
      <Icon name={icon} />
      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <span className="text-lg font-black text-teal-700 transition group-hover:translate-x-1">-&gt;</span>
      </div>
      <p className="mt-4 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">{meta}</p>
    </a>
  )
}

type IconName = 'calendar' | 'clock' | 'plus' | 'chart' | 'user' | 'link'

function Icon({ name }: { name: IconName }) {
  const common = 'stroke-current'
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm ring-1 ring-slate-200">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {name === 'calendar' && (
          <>
            <rect x="4" y="5" width="16" height="15" rx="3" className={common} strokeWidth="2" />
            <path d="M8 3v4M16 3v4M4 10h16" className={common} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {name === 'clock' && (
          <>
            <circle cx="12" cy="12" r="8" className={common} strokeWidth="2" />
            <path d="M12 8v5l3 2" className={common} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {name === 'plus' && (
          <>
            <rect x="4" y="4" width="16" height="16" rx="4" className={common} strokeWidth="2" />
            <path d="M12 8v8M8 12h8" className={common} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {name === 'chart' && (
          <>
            <path d="M5 19V9M12 19V5M19 19v-7" className={common} strokeWidth="2" strokeLinecap="round" />
            <path d="M4 19h16" className={common} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {name === 'user' && (
          <>
            <circle cx="12" cy="8" r="4" className={common} strokeWidth="2" />
            <path d="M5 20c1.5-4 12.5-4 14 0" className={common} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {name === 'link' && (
          <>
            <path d="M10 7h-1a5 5 0 0 0 0 10h2" className={common} strokeWidth="2" strokeLinecap="round" />
            <path d="M14 7h1a5 5 0 0 1 0 10h-2" className={common} strokeWidth="2" strokeLinecap="round" />
            <path d="M9 12h6" className={common} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  )
}

function ProfessionalTodayPanel({
  workDate,
  onDateChange,
  appointments,
  nextAppointment,
  insights,
  onUpdate,
}: {
  workDate: string
  onDateChange: (date: string) => void
  appointments: Appointment[]
  nextAppointment?: Appointment
  insights: Array<{ label: string; value: string; tone: string }>
  onUpdate: (id: string, status: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Jornada profesional</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Agenda del día</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Gestiona pacientes, asistencia y estados desde esta vista.</p>
          </div>
          <input
            type="date"
            value={workDate}
            onChange={(event) => onDateChange(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl bg-[linear-gradient(135deg,#1D4ED8,#0D9488)] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Próximo paciente</p>
          {nextAppointment ? (
            <>
              <h3 className="mt-4 text-2xl font-black tracking-tight">{nextAppointment.patientName}</h3>
              <p className="mt-2 text-sm font-semibold text-white/80">{nextAppointment.startTime} - {nextAppointment.endTime}</p>
              <p className="mt-1 break-all text-sm text-white/65">{nextAppointment.patientEmail}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => onUpdate(nextAppointment.id, 'completada')} className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-blue-700 transition hover:-translate-y-0.5">
                  Atendido
                </button>
                <button type="button" onClick={() => onUpdate(nextAppointment.id, 'no_asiste')} className="rounded-2xl border border-white/25 px-4 py-2 text-xs font-black text-white transition hover:bg-white/10">
                  No asiste
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-semibold text-white/75">
              No hay pacientes agendados para esta fecha.
            </div>
          )}
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-4">
            {insights.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500">{item.label}</p>
                <p className={`mt-1 text-2xl font-black ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 max-h-[310px] space-y-3 overflow-auto pr-1">
            {appointments.length === 0 && <EmptyMini text="Sin pacientes para esta fecha." />}
            {appointments.map((appointment) => (
              <CompactAppointmentRow key={appointment.id} appointment={appointment} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickActionPanel({
  publicLink,
  copied,
  onCopy,
  selectedProfessional,
  canEditPublicProfile,
}: {
  publicLink: string
  copied: boolean
  onCopy: () => void
  selectedProfessional?: Professional
  canEditPublicProfile: boolean
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Acciones rapidas</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">Operar agenda</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {selectedProfessional ? `${selectedProfessional.name} - ${selectedProfessional.specialty}` : 'Selecciona un profesional para operar.'}
      </p>

      <div className="mt-5 grid gap-3">
        <a href="#disponibilidad" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
          <p className="font-black text-slate-950">Habilitar horas</p>
          <p className="mt-1 text-sm text-slate-500">Publica bloques por dia, semana o mes.</p>
        </a>
        <a href="#agenda" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
          <p className="font-black text-slate-950">Crear cita manual</p>
          <p className="mt-1 text-sm text-slate-500">Registra horas tomadas fuera de la web.</p>
        </a>
        {canEditPublicProfile ? (
          <a href="#perfil" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
            <p className="font-black text-slate-950">Editar perfil publico</p>
            <p className="mt-1 text-sm text-slate-500">Foto, especialidad, descripcion y Calendar.</p>
          </a>
        ) : (
          <a href="#perfil" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50">
            <p className="font-black text-slate-950">Ver mi ficha publica</p>
            <p className="mt-1 text-sm text-slate-500">Como te ven los pacientes. Solo lectura.</p>
          </a>
        )}
      </div>

      <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Link clientes</p>
        <p className="mt-2 break-all text-xs font-semibold text-slate-600">{publicLink}</p>
        <button type="button" onClick={onCopy} className="mt-4 h-11 w-full rounded-2xl bg-blue-600 text-sm font-black text-white transition hover:-translate-y-0.5">
          {copied ? 'Link copiado' : 'Copiar link'}
        </button>
      </div>
    </div>
  )
}

function CompactAppointmentRow({ appointment, onUpdate }: { appointment: Appointment; onUpdate: (id: string, status: string) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black text-slate-950">{appointment.startTime} · {appointment.patientName}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{appointment.patientPhone} · {appointment.patientEmail}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={appointment.status} />
        <button type="button" onClick={() => onUpdate(appointment.id, 'completada')} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Atendido</button>
        <button type="button" onClick={() => onUpdate(appointment.id, 'no_asiste')} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-black text-amber-700">No asiste</button>
      </div>
    </div>
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
        <button type="button" onClick={() => onUpdate(appointment.id, 'no_asiste')} className="text-xs font-black text-amber-700 hover:text-amber-800">
          No asiste
        </button>
      </div>
    </div>
  )
}

function ManualAppointmentForm({
  form,
  disabled,
  onChange,
  onSubmit,
}: {
  form: typeof emptyManualForm
  disabled: boolean
  onChange: React.Dispatch<React.SetStateAction<typeof emptyManualForm>>
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Agendamiento manual</p>
        <h3 className="mt-2 text-xl font-black text-slate-950">Crear cita interna</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Registra una hora tomada por telefono, WhatsApp o recepcion. Tambien se enviara al Calendar del profesional.
        </p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <input value={form.patientName} onChange={(event) => onChange((current) => ({ ...current, patientName: event.target.value }))} className={inputClass} placeholder="Nombre paciente" required />
        <input value={form.patientEmail} onChange={(event) => onChange((current) => ({ ...current, patientEmail: event.target.value }))} className={inputClass} placeholder="Correo paciente" type="email" required />
        <input value={form.patientPhone} onChange={(event) => onChange((current) => ({ ...current, patientPhone: event.target.value }))} className={inputClass} placeholder="Telefono paciente" required />
        <input value={form.patientRut} onChange={(event) => onChange((current) => ({ ...current, patientRut: event.target.value }))} className={inputClass} placeholder="RUT opcional" />
        <input value={form.date} onChange={(event) => onChange((current) => ({ ...current, date: event.target.value }))} className={inputClass} type="date" required />
        <div className="grid grid-cols-2 gap-3">
          <input value={form.startTime} onChange={(event) => onChange((current) => ({ ...current, startTime: event.target.value }))} className={inputClass} type="time" required />
          <input value={form.endTime} onChange={(event) => onChange((current) => ({ ...current, endTime: event.target.value }))} className={inputClass} type="time" required />
        </div>
        <textarea value={form.reason} onChange={(event) => onChange((current) => ({ ...current, reason: event.target.value }))} className={`${inputClass} min-h-24 py-3 md:col-span-2`} placeholder="Motivo breve opcional" />
        <button disabled={disabled} className="h-12 rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-50 md:col-span-2">
          Crear cita manual
        </button>
      </form>
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
  const completed = appointments.filter((appointment) => appointment.status === 'completada')
  const noShow = appointments.filter((appointment) => appointment.status === 'no_asiste')

  return [
    { label: 'Citas hoy', value: String(todayAppointments.length), help: 'Reservas activas para la jornada.' },
    { label: 'Atendidos', value: String(completed.length), help: 'Marcados como completados.' },
    { label: 'No atendidos', value: String(noShow.length), help: 'Pacientes no presentados.' },
    { label: 'Pendientes', value: String(confirmed.length), help: 'Citas confirmadas por atender.' },
    { label: 'Bloques activos', value: String(availability.length), help: 'Horarios publicados semanalmente.' },
  ]
}

function buildDailyInsights(appointments: Appointment[]) {
  const completed = appointments.filter((appointment) => appointment.status === 'completada')
  const noShow = appointments.filter((appointment) => appointment.status === 'no_asiste')
  const pending = appointments.filter((appointment) => appointment.status === 'confirmada')

  return [
    { label: 'Total', value: String(appointments.length), tone: 'text-slate-950' },
    { label: 'Atendidos', value: String(completed.length), tone: 'text-blue-700' },
    { label: 'No asiste', value: String(noShow.length), tone: 'text-amber-700' },
    { label: 'Pendientes', value: String(pending.length), tone: 'text-emerald-700' },
  ]
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'

function buildProfileForm(professional: Professional, fallbackEmail = '') {
  return {
    specialty: professional.specialty ?? '',
    professionalType: professional.professionalType ?? '',
    photoUrl: professional.photoUrl ?? '',
    email: professional.email || fallbackEmail,
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
