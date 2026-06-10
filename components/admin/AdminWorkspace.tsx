'use client'

/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useEffect, useMemo, useState, useTransition } from 'react'

type HealthCenter = {
  id: string
  name: string
  slug: string
  description: string
  logoUrl: string
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
}

type Me = {
  isAdmin: boolean
  user: { email?: string } | null
}

const emptyCenter = { name: 'NeuroPlus', slug: 'neuroplus', description: '', logoUrl: '', active: true }
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

export function AdminWorkspace() {
  const [centers, setCenters] = useState<HealthCenter[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')
  const [centerForm, setCenterForm] = useState(emptyCenter)
  const [professionalForm, setProfessionalForm] = useState(emptyProfessional)
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role: 'user' as 'admin' | 'user', centerId: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional.id === selectedProfessionalId),
    [professionals, selectedProfessionalId]
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

  async function loadCenters() {
    const response = await fetch('/api/admin/centers')
    const data = await response.json().catch(() => ({}))
    setCenters(data.centers ?? [])
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
      setUserMessage(data.error ?? 'No se pudieron cargar usuarios. Revisa SUPABASE_SERVICE_ROLE_KEY.')
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
  }

  function submitUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUserMessage(null)
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
      setUserForm({ email: '', password: '', name: '', role: 'user', centerId: '' })
      setUserMessage('Usuario creado.')
    })
  }

  async function updateUserRole(user: ManagedUser, role: 'admin' | 'user') {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, name: user.name || user.email, centerId: user.centerId ?? '' }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setUserMessage(data.error ?? 'No pudimos actualizar rol.')
      return
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, role } : item)))
  }

  async function updateUserCenter(user: ManagedUser, centerId: string) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: user.role, name: user.name || user.email, centerId }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setUserMessage(data.error ?? 'No pudimos actualizar centro.')
      return
    }
    setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, centerId } : item)))
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
              <input value={centerForm.logoUrl} onChange={(e) => setCenterForm((v) => ({ ...v, logoUrl: e.target.value }))} className={inputClass} placeholder="URL logo opcional" />
              <textarea value={centerForm.description} onChange={(e) => setCenterForm((v) => ({ ...v, description: e.target.value }))} className={`${inputClass} min-h-24 py-3`} placeholder="Descripcion" />
              <button className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-black text-white">Crear centro</button>
            </form>
          </Panel>

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
              <input value={professionalForm.calendarId} onChange={(e) => updateProfessionalForm('calendarId', e.target.value)} className={inputClass} placeholder="Google Calendar ID" />
              <textarea value={professionalForm.publicDescription} onChange={(e) => updateProfessionalForm('publicDescription', e.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="Descripcion publica" />
              <button disabled={isPending} className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-50">
                {selectedProfessionalId ? 'Guardar profesional' : 'Crear profesional'}
              </button>
            </form>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Centros disponibles" eyebrow="Operaciones">
            <div className="grid gap-3 md:grid-cols-2">
              {centers.map((center) => (
                <div key={center.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-950">{center.name}</p>
                  <p className="text-xs font-semibold text-slate-400">/{center.slug}</p>
                  <p className="mt-2 text-sm text-slate-500">{center.description || 'Sin descripcion'}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Profesionales publicados" eyebrow="Directorio">
            <div className="grid gap-3 md:grid-cols-2">
              {professionals.map((professional) => (
                <div key={professional.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-3">
                    <Avatar professional={professional} />
                    <div>
                      <p className="font-black text-slate-950">{professional.name}</p>
                      <p className="text-sm font-semibold text-teal-700">{professional.professionalType || professional.specialty}</p>
                      <p className="text-xs text-slate-400">{centers.find((center) => center.id === professional.centerId)?.name ?? 'Sin centro'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setSelectedProfessionalId(professional.id)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Editar</button>
                    <a href={`/agendar/${professional.slug}`} target="_blank" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Ver</a>
                    <button onClick={() => deactivateProfessional(professional.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600">Desactivar</button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Usuarios y permisos" eyebrow="Accesos">
            <form onSubmit={submitUser} className="grid gap-3 lg:grid-cols-2">
              <input value={userForm.name} onChange={(e) => setUserForm((v) => ({ ...v, name: e.target.value }))} className={inputClass} placeholder="Nombre" required />
              <input value={userForm.email} onChange={(e) => setUserForm((v) => ({ ...v, email: e.target.value }))} className={inputClass} placeholder="Email" required />
              <input value={userForm.password} onChange={(e) => setUserForm((v) => ({ ...v, password: e.target.value }))} className={inputClass} placeholder="Clave" type="password" required />
              <select value={userForm.role} onChange={(e) => setUserForm((v) => ({ ...v, role: e.target.value as 'admin' | 'user' }))} className={inputClass}>
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
              <select value={userForm.centerId} onChange={(e) => setUserForm((v) => ({ ...v, centerId: e.target.value }))} className={`${inputClass} lg:col-span-2`}>
                <option value="">Sin centro / todos si es Admin</option>
                {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
              <button className="h-12 rounded-2xl bg-slate-950 text-sm font-black text-white lg:col-span-2">Crear usuario</button>
            </form>
            {userMessage && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">{userMessage}</p>}
            <div className="mt-5 space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-slate-950">{user.name || user.email}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs text-slate-400">{centers.find((center) => center.id === user.centerId)?.name ?? 'Sin centro'}</p>
                  </div>
                  <div className="flex gap-2">
                    <select value={user.role} onChange={(e) => updateUserRole(user, e.target.value as 'admin' | 'user')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
                      <option value="user">Usuario</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select value={user.centerId ?? ''} onChange={(e) => updateUserCenter(user, e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
                      <option value="">Sin centro</option>
                      {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
                    </select>
                  </div>
                </div>
              ))}
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
