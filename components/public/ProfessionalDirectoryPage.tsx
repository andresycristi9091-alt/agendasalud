'use client'

import { useEffect, useMemo, useState } from 'react'

type Professional = {
  id: string
  slug: string
  name: string
  specialty: string
  professionalType: string
  centerName: string
  publicDescription: string
  photoUrl: string
}

export function ProfessionalDirectoryPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState('Todos')

  useEffect(() => {
    fetch('/api/public/professionals')
      .then((response) => response.json())
      .then((data) => setProfessionals(data.professionals ?? []))
      .finally(() => setLoading(false))
  }, [])

  const types = useMemo(() => {
    const values = professionals.map((professional) => professional.professionalType || professional.specialty)
    return ['Todos', ...Array.from(new Set(values.filter(Boolean)))]
  }, [professionals])

  const filtered = professionals.filter((professional) => {
    const text = `${professional.name} ${professional.specialty} ${professional.professionalType}`.toLowerCase()
    const matchesQuery = text.includes(query.toLowerCase())
    const matchesType = selectedType === 'Todos' || professional.professionalType === selectedType || professional.specialty === selectedType
    return matchesQuery && matchesType
  })

  return (
    <main id="main-content" className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <NeuroPlusMark />
            <div>
              <p className="text-sm font-black tracking-tight text-slate-950">NeuroPlus</p>
              <p className="text-xs font-semibold text-slate-400">Agenda de atencion profesional</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 sm:block">
            Hora chilena
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#172554_0%,#2563EB_45%,#14B8A6_100%)] p-6 text-white shadow-[0_24px_80px_rgba(37,99,235,0.24)] sm:p-10">
          <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80">
            NeuroPlus online
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Elige tu profesional y agenda en minutos.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
            Revisa especialistas disponibles, selecciona una hora real y confirma tus datos sin llamadas ni esperas.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <TrustCard value="1" label="Selecciona profesional" />
            <TrustCard value="2" label="Elige fecha y hora" />
            <TrustCard value="3" label="Confirma tu reserva" />
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="sr-only">Buscar profesional</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, especialidad o tipo de profesional"
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                autoComplete="off"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filtrar por tipo de profesional">
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  aria-pressed={selectedType === type}
                  className={[
                    'h-13 whitespace-nowrap rounded-2xl border px-4 text-sm font-black transition',
                    selectedType === type
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-[28px] bg-white shadow-sm" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="mt-8 rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center" role="status">
            <p className="text-xl font-black text-slate-900">No encontramos profesionales con ese filtro.</p>
            <p className="mt-2 text-sm text-slate-500">Prueba con otra especialidad o borra la busqueda.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label={`${filtered.length} profesionales encontrados`}>
            {filtered.map((professional) => (
              <ProfessionalCard key={professional.id} professional={professional} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function ProfessionalCard({ professional }: { professional: Professional }) {
  return (
    <a
      href={`/agendar/${professional.slug}`}
      aria-label={`Ver horas disponibles con ${professional.name}, ${professional.professionalType || professional.specialty}`}
      className="group block overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_12px_38px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_22px_55px_rgba(37,99,235,0.14)]"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ProfessionalAvatar professional={professional} />
          <div className="min-w-0">
            <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {professional.professionalType || professional.specialty}
            </p>
            <h2 className="mt-3 truncate text-xl font-black tracking-tight text-slate-950">{professional.name}</h2>
            <p className="mt-1 text-sm font-semibold text-teal-700">{professional.specialty}</p>
          </div>
        </div>

        <p className="mt-5 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-500">
          {professional.publicDescription || 'Profesional disponible para atencion en NeuroPlus.'}
        </p>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <span className="text-sm font-black text-slate-700">Ver horas disponibles</span>
          <span className="text-lg font-black text-blue-600 transition group-hover:translate-x-1">-&gt;</span>
        </div>
      </div>
    </a>
  )
}

function ProfessionalAvatar({ professional }: { professional: Professional }) {
  if (professional.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={professional.photoUrl}
        alt={professional.name}
        className="h-20 w-20 rounded-3xl object-cover ring-4 ring-blue-50"
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
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#2563EB,#14B8A6)] text-xl font-black text-white ring-4 ring-blue-50">
      {initials || 'NP'}
    </div>
  )
}

function NeuroPlusMark() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#14B8A6)] text-sm font-black text-white shadow-lg">
      NP
    </div>
  )
}

function TrustCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/14 p-4 backdrop-blur">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/75">{label}</p>
    </div>
  )
}
