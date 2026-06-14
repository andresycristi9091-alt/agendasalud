'use client'

/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

type HealthCenter = {
  id: string
  name: string
  slug: string
  description: string
  logoUrl: string
  address: string
  city: string
  region: string
  phone: string
  email: string
  active: boolean
}

type Professional = {
  id: string
  slug: string
  name: string
  specialty: string
  professionalType?: string
  centerName: string
  centerId?: string
  email: string
  phone: string
  calendarId: string
  publicDescription: string
  appointmentDurationDefault: number
  timezone: string
  active: boolean
  photoUrl?: string
}

type ManagedUser = {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  centerId?: string
  active: boolean
  source?: string
}

type Appointment = {
  id: string
  professionalId: string
  patientName: string
  date: string
  status: string
}

type Me = {
  isAdmin: boolean
  user: { email?: string } | null
}

const emptyCenter = { name: 'NeuroPlus', slug: 'neuroplus', description: '', logoUrl: '', address: '', city: '', region: '', phone: '', email: '', active: true }
const emptyProfessional = {
  slug: '',
  name: '',
  specialty: '',
  professionalType: '',
  centerName: 'NeuroPlus',
  centerId: '',
  email: '',
  phone: '',
  calendarId: '',
  publicDescription: '',
  appointmentDurationDefault: 30,
  timezone: 'America/Santiago',
  active: true,
  photoUrl: '',
}

const emptyUserEditForm = { email: '', password: '', name: '', role: 'user' as 'admin' | 'user', centerId: '', active: true }

export function AdminWorkspace() {
  const [centers, setCenters] = useState<HealthCenter[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedStatsCenterId, setSelectedStatsCenterId] = useState('')
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [pendingDeleteProfessionalId, setPendingDeleteProfessionalId] = useState('')
  const [centerForm, setCenterForm] = useState(emptyCenter)
  const [professionalForm, setProfessionalForm] = useState(emptyProfessional)
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role: 'user' as 'admin' | 'user', centerId: '' })
  const [userEditForm, setUserEditForm] = useState(emptyUserEditForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [lastCreatedUser, setLastCreatedUser] = useState<{ name: string; email: string; password: string } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const professionalFormRef = useRef<HTMLDivElement | null>(null)

  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional.id === selectedProfessionalId),
    [professionals, selectedProfessionalId]
  )
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [users, selectedUserId]
  )

  useEffect(() => {
    loadMe()
      .then((context) => {
        if (!context?.isAdmin) return
        return Promise.all([loadCenters(), loadProfessionals(), loadUsers()])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (professionals.length === 0) return
    Promise.all(
      professionals.map((professional) =>
        fetch(`/api/dashboard/appointments?professionalId=${professional.id}`)
          .then((response) => response.json())
          .then((data) => data.appointments ?? [])
          .catch(() => [])
      )
    ).then((groups) => setAppointments(groups.flat()))
  }, [professionals])

  useEffect(() => {
    if (!selectedProfessional) {
      setProfessionalForm(emptyProfessional)
      return
    }
    setProfessionalForm({
      slug: selectedProfessional.slug,
      name: selectedProfessional.name,
      specialty: selectedProfessional.specialty,
      professionalType: selectedProfessional.professionalType ?? '',
      centerName: selectedProfessional.centerName || 'NeuroPlus',
      centerId: selectedProfessional.centerId ?? '',
      email: selectedProfessional.email ?? '',
      phone: selectedProfessional.phone ?? '',
      calendarId: selectedProfessional.calendarId ?? '',
      publicDescription: selectedProfessional.publicDescription ?? '',
      appointmentDurationDefault: Number(selectedProfessional.appointmentDurationDefault || 30),
      timezone: selectedProfessional.timezone || 'America/Santiago',
      active: Boolean(selectedProfessional.active),
      photoUrl: selectedProfessional.photoUrl ?? '',
    })
  }, [selectedProfessional])

  useEffect(() => {
    if (!selectedUser) {
      setUserEditForm(emptyUserEditForm)
      return
    }

    setUserEditForm({
      email: selectedUser.email,
      password: '',
      name: selectedUser.name || selectedUser.email,
      role: selectedUser.role,
      centerId: selectedUser.centerId ?? '',
      active: selectedUser.active,
    })
  }, [selectedUser])

  async function loadCenters() {
    const response = await fetch('/api/admin/centers')
    const data = await response.json().catch(() => ({}))
    const loadedCenters = data.centers ?? []
    setCenters(loadedCenters)
    setSelectedStatsCenterId((current) => current || loadedCenters[0]?.id || '')
    const neuroplus = loadedCenters.find((center: HealthCenter) => center.slug === 'neuroplus')
    if (neuroplus) {
      setUserForm((current) => current.centerId ? current : { ...current, centerId: neuroplus.id })
      setProfessionalForm((current) => current.centerId ? current : { ...current, centerId: neuroplus.id, centerName: neuroplus.name })
    }
  }

  async function loadMe() {
    const response = await fetch('/api/admin/me')
    const data = await response.json().catch(() => null)
    setMe(data)
    return data as Me | null
  }

  async function loadProfessionals() {
    const response = await fetch('/api/admin/professionals')
    const data = await response.json().catch(() => ({}))
    setProfessionals(data.professionals ?? [])
  }

  async function loadUsers() {
    const response = await fetch('/api/admin/users')
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setUserMessage(data.error ?? 'No se pudieron cargar usuarios.')
      return
    }
    setUsers(data.users ?? [])
  }

  function submitCenter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const response = await fetch('/api/admin/centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(centerForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage(data.error ?? 'No pudimos crear el centro.')
        return
      }
      setCenters(data.centers ?? [])
      setCenterForm(emptyCenter)
      setMessage('Centro creado. Ahora puedes asignarle profesionales y usuarios.')
    })
  }

  function submitProfessional(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    const center = centers.find((item) => item.id === professionalForm.centerId)
    const payload = { ...professionalForm, centerName: center?.name ?? professionalForm.centerName ?? 'NeuroPlus' }

    startTransition(async () => {
      const editing = Boolean(selectedProfessionalId)
      const response = await fetch(editing ? `/api/admin/professionals/${selectedProfessionalId}` : '/api/admin/professionals', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage(data.error ?? 'No pudimos guardar el profesional.')
        return
      }
      setProfessionals(data.professionals ?? [])
      setMessage(editing ? 'Profesional actualizado.' : 'Profesional creado.')
      if (!editing) setProfessionalForm(emptyProfessional)
    })
  }

  async function deactivateProfessional(id: string) {
    const response = await fetch(`/api/admin/professionals/${id}`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(data.error ?? 'No pudimos desactivar el profesional.')
      return
    }
    setProfessionals(data.professionals ?? [])
    setSelectedProfessionalId('')
    setMessage('Profesional desactivado. Ya no aparecera en el agendamiento publico.')
  }

  async function deleteProfessional(id: string) {
    const professional = professionals.find((item) => item.id === id)
    if (pendingDeleteProfessionalId !== id) {
      setPendingDeleteProfessionalId(id)
      setMessage(`Confirma la eliminacion de ${professional?.name ?? 'este profesional'}.`)
      return
    }

    const response = await fetch(`/api/admin/professionals/${id}?hard=true`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(data.error ?? 'No pudimos eliminar el profesional.')
      return
    }
    setProfessionals(data.professionals ?? [])
    setPendingDeleteProfessionalId('')
    if (selectedProfessionalId === id) {
      setSelectedProfessionalId('')
      setProfessionalForm(emptyProfessional)
    }
    setMessage('Profesional eliminado definitivamente.')
  }

  async function reactivateProfessional(id: string) {
    const response = await fetch(`/api/admin/professionals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(data.error ?? 'No pudimos reactivar el profesional.')
      return
    }
    setProfessionals(data.professionals ?? [])
    setMessage('Profesional reactivado. Puede volver a aparecer en el agendamiento publico.')
  }

  function editProfessional(id: string) {
    setPendingDeleteProfessionalId('')
    setSelectedProfessionalId(id)
    window.setTimeout(() => {
      professionalFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  function clearProfessionalEdit() {
    setSelectedProfessionalId('')
    setProfessionalForm(emptyProfessional)
  }

  function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUserMessage(null)
    setLastCreatedUser(null)
    const passwordSnapshot = userForm.password
    startTransition(async () => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setUserMessage(data.error ?? 'No pudimos crear usuario.')
        return
      }
      setUsers((current) => [data.user, ...current])
      setLastCreatedUser({ name: data.user.name, email: data.user.email, password: passwordSnapshot })
      setUserForm({ email: '', password: '', name: '', role: 'user', centerId: '' })
    })
  }

  async function submitUserEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedUserId) return
    setUserMessage(null)

    const payload = {
      email: userEditForm.email,
      name: userEditForm.name,
      role: userEditForm.role,
      centerId: userEditForm.centerId,
      active: userEditForm.active,
      ...(userEditForm.password ? { password: userEditForm.password } : {}),
    }

    const response = await fetch(`/api/admin/users/${selectedUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setUserMessage(data.error ?? 'No pudimos actualizar usuario.')
      return
    }

    setUsers((current) => current.map((item) => (item.id === selectedUserId ? { ...item, ...data.user } : item)))
    setUserEditForm((current) => ({ ...current, password: '' }))
    setUserMessage('Usuario actualizado.')
  }

  async function setUserActive(user: ManagedUser, active: boolean) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, name: user.name || user.email, role: user.role, centerId: user.centerId ?? '' }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setUserMessage(data.error ?? 'No pudimos cambiar el estado del usuario.')
      return
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, active } : item)))
    setUserMessage(active ? 'Usuario reactivado.' : 'Usuario desactivado.')
  }

  async function deleteUser(user: ManagedUser) {
    if (!window.confirm(`Eliminar definitivamente a ${user.email}? Esta accion no se puede deshacer.`)) return

    const response = await fetch(`/api/admin/users/${user.id}?hard=true`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setUserMessage(data.error ?? 'No pudimos eliminar usuario.')
      return
    }
    setUsers((current) => current.filter((item) => item.id !== user.id))
    if (selectedUserId === user.id) setSelectedUserId('')
    setUserMessage('Usuario eliminado definitivamente.')
  }

  if (loading) return <div className="rounded-3xl bg-white p-10 text-center font-bold text-slate-400">Cargando Admin...</div>

  if (!me?.isAdmin) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-8">
        <h1 className="text-2xl font-black text-red-900">Acceso restringido</h1>
        <p className="mt-2 text-sm font-semibold text-red-700">Tu usuario no tiene permisos de administrador.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#172554,#2563EB,#14B8A6)] p-8 text-white shadow-[0_24px_80px_rgba(37,99,235,0.20)]">
        <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80">
          Admin central
        </p>
        <h1 className="max-w-3xl text-4xl font-black tracking-tight">Centros, profesionales y usuarios</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/78">
          Cada centro opera de forma independiente. Admin puede ver todo; usuario solo ve el centro asignado.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Panel title="Crear centro" eyebrow="Centros">
            <form onSubmit={submitCenter} className="space-y-3">
              <input value={centerForm.name} onChange={(e) => setCenterForm((v) => ({ ...v, name: e.target.value, slug: slugify(e.target.value) }))} className={inputClass} placeholder="Nombre del centro" required />
              <input value={centerForm.slug} onChange={(e) => setCenterForm((v) => ({ ...v, slug: slugify(e.target.value) }))} className={inputClass} placeholder="slug-centro" required />
              <input value={centerForm.address} onChange={(e) => setCenterForm((v) => ({ ...v, address: e.target.value }))} className={inputClass} placeholder="Direccion del centro" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={centerForm.city} onChange={(e) => setCenterForm((v) => ({ ...v, city: e.target.value }))} className={inputClass} placeholder="Comuna / ciudad" />
                <input value={centerForm.region} onChange={(e) => setCenterForm((v) => ({ ...v, region: e.target.value }))} className={inputClass} placeholder="Region" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={centerForm.phone} onChange={(e) => setCenterForm((v) => ({ ...v, phone: e.target.value }))} className={inputClass} placeholder="Telefono" />
                <input value={centerForm.email} onChange={(e) => setCenterForm((v) => ({ ...v, email: e.target.value }))} className={inputClass} placeholder="Correo centro" />
              </div>
              <input value={centerForm.logoUrl} onChange={(e) => setCenterForm((v) => ({ ...v, logoUrl: e.target.value }))} className={inputClass} placeholder="URL logo opcional" />
              <textarea value={centerForm.description} onChange={(e) => setCenterForm((v) => ({ ...v, description: e.target.value }))} className={`${inputClass} min-h-24 py-3`} placeholder="Descripcion" />
              <button className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-black text-white">Crear centro</button>
            </form>
          </Panel>

          <div id="admin-professional-form" ref={professionalFormRef}>
          <Panel title={selectedProfessionalId ? 'Editar profesional' : 'Nuevo profesional'} eyebrow="Profesionales">
            <form onSubmit={submitProfessional} className="space-y-3">
              <select value={professionalForm.centerId} onChange={(e) => updateProfessionalForm('centerId', e.target.value)} className={inputClass}>
                <option value="">Seleccionar centro</option>
                {centers.filter((center) => center.active).map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
              <input value={professionalForm.name} onChange={(e) => updateProfessionalForm('name', e.target.value)} className={inputClass} placeholder="Nombre profesional" required />
              <input value={professionalForm.slug} onChange={(e) => updateProfessionalForm('slug', slugify(e.target.value))} className={inputClass} placeholder="slug-publico" required />
              <input value={professionalForm.professionalType} onChange={(e) => updateProfessionalForm('professionalType', e.target.value)} className={inputClass} placeholder="Tipo: Neurologo, Psicologa..." />
              <input value={professionalForm.specialty} onChange={(e) => updateProfessionalForm('specialty', e.target.value)} className={inputClass} placeholder="Especialidad" required />
              <input value={professionalForm.photoUrl} onChange={(e) => updateProfessionalForm('photoUrl', e.target.value)} className={inputClass} placeholder="URL fotografia" />
              <input value={professionalForm.email} onChange={(e) => updateProfessionalForm('email', e.target.value)} className={inputClass} placeholder="Correo profesional / calendario principal" />
              <input value={professionalForm.phone} onChange={(e) => updateProfessionalForm('phone', e.target.value)} className={inputClass} placeholder="Telefono profesional" />
              <input value={professionalForm.calendarId} onChange={(e) => updateProfessionalForm('calendarId', e.target.value)} className={inputClass} placeholder="Calendar ID opcional" />
              <select value={professionalForm.appointmentDurationDefault} onChange={(e) => updateProfessionalForm('appointmentDurationDefault', Number(e.target.value))} className={inputClass}>
                <option value={10}>10 minutos</option>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
              </select>
              <select value={professionalForm.timezone} onChange={(e) => updateProfessionalForm('timezone', e.target.value)} className={inputClass}>
                <option value="America/Santiago">America/Santiago</option>
              </select>
              <textarea value={professionalForm.publicDescription} onChange={(e) => updateProfessionalForm('publicDescription', e.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="Descripcion publica" />
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={professionalForm.active}
                  onChange={(e) => updateProfessionalForm('active', e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Profesional activo y visible para agendamiento publico
              </label>
              <button disabled={isPending} className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-50">
                {selectedProfessionalId ? 'Guardar profesional' : 'Crear profesional'}
              </button>
              {selectedProfessionalId && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={clearProfessionalEdit} className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50">
                    Cancelar edicion
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProfessional(selectedProfessionalId)}
                    className={`h-12 rounded-2xl border text-sm font-black transition ${
                      pendingDeleteProfessionalId === selectedProfessionalId
                        ? 'border-red-500 bg-red-600 text-white hover:bg-red-700'
                        : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {pendingDeleteProfessionalId === selectedProfessionalId ? 'Confirmar eliminacion' : 'Eliminar registro'}
                  </button>
                </div>
              )}
            </form>
          </Panel>
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Centros disponibles" eyebrow="Operaciones">
            <div className="grid gap-3 md:grid-cols-2">
              {centers.map((center) => (
                <div key={center.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-950">{center.name}</p>
                  <p className="text-xs font-semibold text-slate-400">/{center.slug}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{[center.address, center.city, center.region].filter(Boolean).join(', ') || 'Sin direccion'}</p>
                  <p className="mt-1 text-xs text-slate-400">{[center.phone, center.email].filter(Boolean).join(' · ') || 'Sin contacto'}</p>
                  <p className="mt-2 text-sm text-slate-500">{center.description || 'Sin descripcion'}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Profesionales publicados" eyebrow="Directorio">
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-900">Acciones del directorio</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-blue-700">
                Usa <span className="font-black">Quitar del directorio</span> para ocultar una persona del agendamiento publico. Usa <span className="font-black">Eliminar registro</span> solo si quieres borrar el registro administrativo.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {professionals.map((professional) => (
                <div key={professional.id} className={`rounded-2xl border p-4 ${professional.active ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex gap-3">
                    <Avatar professional={professional} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950">{professional.name}</p>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${professional.active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {professional.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-teal-700">{professional.professionalType || professional.specialty}</p>
                      <p className="text-xs text-slate-400">{centers.find((center) => center.id === professional.centerId)?.name ?? 'Sin centro'}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <a
                      href="#admin-professional-form"
                      onClick={() => editProfessional(professional.id)}
                      className="rounded-xl bg-blue-600 px-3 py-3 text-center text-xs font-black text-white transition hover:bg-blue-700"
                    >
                      Editar
                    </a>
                    <a href={`/agendar/${professional.slug}`} target="_blank" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-slate-600 transition hover:bg-slate-100">Ver</a>
                    {professional.active ? (
                      <button type="button" onClick={() => deactivateProfessional(professional.id)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-black text-amber-700 transition hover:bg-amber-100">Quitar del directorio</button>
                    ) : (
                      <button type="button" onClick={() => reactivateProfessional(professional.id)} className="rounded-xl border border-emerald-200 bg-white px-3 py-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-50">Reactivar</button>
                    )}
                  </div>

                  <div className="mt-3 border-t border-red-100 pt-3">
                    <button
                      type="button"
                      onClick={() => deleteProfessional(professional.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-xs font-black transition ${
                        pendingDeleteProfessionalId === professional.id
                          ? 'border-red-500 bg-red-600 text-white hover:bg-red-700'
                          : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {pendingDeleteProfessionalId === professional.id ? 'Confirmar eliminacion' : 'Eliminar registro'}
                    </button>
                  </div>
                  {pendingDeleteProfessionalId === professional.id && (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                      Esta accion intentara borrar la fila. Si Google Sheets no lo permite, el profesional quedara desactivado y fuera del directorio publico.
                      <button type="button" onClick={() => setPendingDeleteProfessionalId('')} className="ml-2 underline">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Usuarios y permisos" eyebrow="Accesos">
            <form onSubmit={submitUser} className="grid gap-3 lg:grid-cols-2">
              <input
                value={userForm.name}
                onChange={(e) => setUserForm((v) => ({ ...v, name: e.target.value }))}
                className={inputClass}
                placeholder="Nombre completo"
                autoComplete="off"
                required
              />
              <input
                value={userForm.email}
                onChange={(e) => setUserForm((v) => ({ ...v, email: e.target.value }))}
                className={inputClass}
                placeholder="Email"
                type="email"
                autoComplete="off"
                required
              />
              <div className="relative">
                <input
                  value={userForm.password}
                  onChange={(e) => setUserForm((v) => ({ ...v, password: e.target.value }))}
                  className={`${inputClass} pr-20`}
                  placeholder="Clave inicial (min. 8 caracteres)"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <select value={userForm.role} onChange={(e) => setUserForm((v) => ({ ...v, role: e.target.value as 'admin' | 'user' }))} className={inputClass}>
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
              <select value={userForm.centerId} onChange={(e) => setUserForm((v) => ({ ...v, centerId: e.target.value }))} className={`${inputClass} lg:col-span-2`}>
                <option value="">Sin centro / todos si es Admin</option>
                {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
              <button disabled={isPending} className="h-12 rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-60 lg:col-span-2">
                {isPending ? 'Creando...' : 'Crear usuario'}
              </button>
            </form>

            {userMessage && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{userMessage}</p>}

            {lastCreatedUser && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 text-sm font-black text-emerald-800">Usuario creado. Comparte estas credenciales:</p>
                <div className="space-y-1 rounded-xl border border-emerald-200 bg-white p-3 font-mono text-sm text-slate-700">
                  <p><span className="font-bold text-slate-400">Email:</span> {lastCreatedUser.email}</p>
                  <p><span className="font-bold text-slate-400">Clave:</span> {lastCreatedUser.password}</p>
                </div>
                <p className="mt-2 text-xs text-emerald-700">El profesional puede cambiar su clave desde el dashboard en Perfil.</p>
                <button
                  type="button"
                  onClick={() => setLastCreatedUser(null)}
                  className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  Cerrar
                </button>
              </div>
            )}

            {selectedUser && (
              <form onSubmit={submitUserEdit} className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Editar usuario</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{selectedUser.email}</h3>
                  </div>
                  <button type="button" onClick={() => setSelectedUserId('')} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700">
                    Cerrar
                  </button>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <input
                    value={userEditForm.name}
                    onChange={(e) => setUserEditForm((v) => ({ ...v, name: e.target.value }))}
                    className={inputClass}
                    placeholder="Nombre completo"
                    required
                  />
                  <input
                    value={userEditForm.email}
                    onChange={(e) => setUserEditForm((v) => ({ ...v, email: e.target.value }))}
                    className={inputClass}
                    placeholder="Email"
                    type="email"
                    required
                  />
                  <div className="relative">
                    <input
                      value={userEditForm.password}
                      onChange={(e) => setUserEditForm((v) => ({ ...v, password: e.target.value }))}
                      className={`${inputClass} pr-20`}
                      placeholder="Nueva clave opcional"
                      type={showEditPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      {showEditPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                  <select value={userEditForm.role} onChange={(e) => setUserEditForm((v) => ({ ...v, role: e.target.value as 'admin' | 'user' }))} className={inputClass}>
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select value={userEditForm.centerId} onChange={(e) => setUserEditForm((v) => ({ ...v, centerId: e.target.value }))} className={inputClass}>
                    <option value="">Sin centro / todos si es Admin</option>
                    {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
                  </select>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                    <input
                      type="checkbox"
                      checked={userEditForm.active}
                      onChange={(e) => setUserEditForm((v) => ({ ...v, active: e.target.checked }))}
                      className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Usuario activo
                  </label>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button className="h-12 rounded-2xl bg-blue-600 text-sm font-black text-white">Guardar cambios</button>
                  <button type="button" onClick={() => setUserActive(selectedUser, !selectedUser.active)} className="h-12 rounded-2xl border border-amber-200 bg-white text-sm font-black text-amber-700">
                    {selectedUser.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                  <button type="button" onClick={() => deleteUser(selectedUser)} className="h-12 rounded-2xl border border-red-200 bg-white text-sm font-black text-red-600">
                    Eliminar definitivo
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 space-y-3">
              {users.map((user) => (
                <div key={user.id} className={`flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${user.active ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{user.name || <span className="italic text-slate-400">Sin nombre</span>}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs text-slate-400">{centers.find((center) => center.id === user.centerId)?.name ?? 'Sin centro'}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => setSelectedUserId(user.id)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Editar</button>
                    <button type="button" onClick={() => setUserActive(user, !user.active)} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-700">
                      {user.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                    <button type="button" onClick={() => deleteUser(user)} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Estadisticas por centro" eyebrow="Gestion">
            <div className="mb-5">
              <select value={selectedStatsCenterId} onChange={(e) => setSelectedStatsCenterId(e.target.value)} className={inputClass}>
                {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
            </div>
            <StatsGrid stats={buildCenterStats(selectedStatsCenterId, professionals, appointments)} />
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-black text-slate-800">Estadisticas por usuario/profesional</h3>
              <div className="space-y-3">
                {professionals.filter((professional) => professional.centerId === selectedStatsCenterId).map((professional) => (
                  <div key={professional.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{professional.name}</p>
                    <StatsGrid compact stats={buildProfessionalStats(professional.id, appointments)} />
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </section>

      {message && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-black text-blue-700">{message}</div>}
    </div>
  )

  function updateProfessionalForm<K extends keyof typeof professionalForm>(key: K, value: (typeof professionalForm)[K]) {
    setProfessionalForm((current) => ({ ...current, [key]: value }))
  }
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  )
}

function StatsGrid({ stats, compact = false }: { stats: Array<{ label: string; value: string; help: string }>; compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? 'mt-3 sm:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold text-slate-500">{stat.label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{stat.value}</p>
          <p className="mt-1 text-xs text-slate-400">{stat.help}</p>
        </div>
      ))}
    </div>
  )
}

function buildCenterStats(centerId: string, professionals: Professional[], appointments: Appointment[]) {
  const professionalIds = new Set(professionals.filter((professional) => professional.centerId === centerId).map((professional) => professional.id))
  return buildStats(appointments.filter((appointment) => professionalIds.has(appointment.professionalId)))
}

function buildProfessionalStats(professionalId: string, appointments: Appointment[]) {
  return buildStats(appointments.filter((appointment) => appointment.professionalId === professionalId))
}

function buildStats(appointments: Appointment[]) {
  const today = getTodayISO()
  const todayAppointments = appointments.filter((appointment) => appointment.date === today)
  const completed = appointments.filter((appointment) => appointment.status === 'completada')
  const noShow = appointments.filter((appointment) => appointment.status === 'no_asiste')
  const pending = appointments.filter((appointment) => appointment.status === 'confirmada')

  return [
    { label: 'Pacientes hoy', value: String(todayAppointments.length), help: 'Agendados para la fecha actual.' },
    { label: 'Atendidos', value: String(completed.length), help: 'Marcados como completados.' },
    { label: 'No atendidos', value: String(noShow.length), help: 'Marcados como no asiste.' },
    { label: 'Pendientes', value: String(pending.length), help: 'Confirmados por gestionar.' },
  ]
}

function Avatar({ professional }: { professional: Professional }) {
  if (professional.photoUrl) {
    return <img src={professional.photoUrl} alt={professional.name} className="h-14 w-14 rounded-2xl object-cover" />
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#14B8A6)] text-sm font-black text-white">
      {professional.name.slice(0, 2).toUpperCase() || 'NP'}
    </div>
  )
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'

function getTodayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
