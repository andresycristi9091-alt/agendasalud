'use client'

import Link from 'next/link'
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
  const [selectedSlug, setSelectedSlug] = useState('')

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

  const selectedProfessional =
    filtered.find((professional) => professional.slug === selectedSlug) ??
    filtered[0] ??
    null

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
        <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#172554_0%,#2563EB_45%,#14B8A6_100%)] text-white shadow-[0_24px_80px_rgba(37,99,235,0.24)]">
          <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80">
                NeuroPlus online
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Elige tu profesional y agenda en minutos.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
                Un funnel simple: revisa el equipo, selecciona a la persona correcta y entra a sus horarios disponibles.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/12 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Proceso de agenda</p>
              <div className="mt-4 space-y-3">
                <TrustCard value="1" label="Elige profesional" />
                <TrustCard value="2" label="Revisa disponibilidad" />
                <TrustCard value="3" label="Confirma tu hora" />
              </div>
            </div>
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
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-5 md:grid-cols-2" aria-label={`${filtered.length} profesionales encontrados`}>
              {filtered.map((professional) => (
                <ProfessionalCard
                  key={professional.id}
                  professional={professional}
                  selected={selectedProfessional?.slug === professional.slug}
                  onSelect={() => setSelectedSlug(professional.slug)}
                />
              ))}
            </div>
            <SelectionPanel professional={selectedProfessional} />
          </div>
        )}
      </section>
    </main>
  )
}

function ProfessionalCard({
  professional,
  selected,
  onSelect,
}: {
  professional: Professional
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'group block overflow-hidden rounded-[30px] border bg-white text-left shadow-[0_12px_38px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(37,99,235,0.14)] focus:outline-none focus:ring-4 focus:ring-blue-500/10',
        selected ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-blue-200',
      ].join(' ')}
    >
      <div className="relative h-40 overflow-hidden bg-[linear-gradient(135deg,#DBEAFE,#CCFBF1)]">
        <ProfessionalHeroImage professional={professional} />
        <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-xs font-black text-blue-700 shadow-sm">
          {professional.professionalType || professional.specialty}
        </div>
        {selected && (
          <div className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white shadow-sm">
            Seleccionado
          </div>
        )}
      </div>
      <div className="p-5">
        <h2 className="truncate text-xl font-black tracking-tight text-slate-950">{professional.name}</h2>
        <p className="mt-1 text-sm font-semibold text-teal-700">{professional.specialty}</p>

        <p className="mt-5 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-500">
          {professional.publicDescription || 'Profesional disponible para atencion en NeuroPlus.'}
        </p>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <span className="text-sm font-black text-slate-700">Seleccionar profesional</span>
          <span className="text-lg font-black text-blue-600 transition group-hover:translate-x-1">-&gt;</span>
        </div>
      </div>
    </button>
  )
}

function SelectionPanel({ professional }: { professional: Professional | null }) {
  if (!professional) return null

  return (
    <aside className="h-fit rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-[26px] bg-slate-100">
        <div className="relative h-52">
          <ProfessionalHeroImage professional={professional} />
        </div>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-blue-700">Profesional seleccionado</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{professional.name}</h2>
      <p className="mt-1 text-sm font-black text-teal-700">{professional.professionalType || professional.specialty}</p>
      <p className="mt-4 text-sm leading-6 text-slate-500">
        {professional.publicDescription || 'Revisa horarios disponibles y confirma tu cita en pocos pasos.'}
      </p>

      <div className="mt-5 grid gap-3">
        <FunnelMiniStep number="1" text="Seleccionaste profesional" active />
        <FunnelMiniStep number="2" text="Entra a su calendario" />
        <FunnelMiniStep number="3" text="Confirma tus datos" />
      </div>

      <Link
        href={`/agendar/${professional.slug}`}
        className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#14B8A6)] px-5 text-sm font-black text-white shadow-[0_16px_35px_rgba(37,99,235,0.20)] transition hover:-translate-y-0.5"
      >
        Ingresar a la agenda
      </Link>
    </aside>
  )
}

function FunnelMiniStep({ number, text, active = false }: { number: string; text: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <span className={[
        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-black',
        active ? 'bg-blue-600 text-white' : 'bg-white text-slate-500',
      ].join(' ')}>
        {number}
      </span>
      <span className="text-sm font-black text-slate-700">{text}</span>
    </div>
  )
}

function ProfessionalHeroImage({ professional }: { professional: Professional }) {
  if (professional.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={professional.photoUrl}
        alt={professional.name}
        className="h-full w-full object-cover"
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
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.65),transparent_26%),linear-gradient(135deg,#2563EB,#14B8A6)]">
      <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/25 bg-white/18 text-3xl font-black text-white shadow-lg backdrop-blur">
        {initials || 'NP'}
      </div>
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
