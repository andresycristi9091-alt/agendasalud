'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AgendaSaludLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos. Verifica tus credenciales.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">

        {/* ── Panel izquierdo ── */}
        <section
          className="relative flex min-h-[52vh] flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-16"
          style={{
            background:
              'radial-gradient(circle at 85% 12%, rgba(255,255,255,0.24), transparent 30%), linear-gradient(135deg, #1D4ED8 0%, #0891B2 48%, #10B981 100%)',
          }}
        >
          {/* Decoración */}
          <div className="pointer-events-none absolute -left-24 bottom-[-140px] h-96 w-96 rounded-full bg-white/10 blur-sm" />
          <div className="pointer-events-none absolute right-[-140px] top-[-130px] h-[460px] w-[460px] rounded-full bg-white/10 blur-sm" />
          <div className="pointer-events-none absolute left-[58%] top-[18%] h-56 w-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute left-[8%] top-[62%] h-24 w-24 rounded-full border border-white/10" />

          {/* Logo */}
          <header className="relative z-10 flex items-center gap-3">
            <AgendaSaludLogo />
            <div>
              <p className="text-xl font-black tracking-tight">
                Agenda<span className="text-emerald-200">Salud</span>
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">
                Health scheduling
              </p>
            </div>
          </header>

          {/* Hero */}
          <div className="relative z-10 max-w-3xl py-14 lg:py-0">
            <div className="mb-5 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur">
              Plataforma inteligente para centros de salud
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Te ayudamos a gestionar tus horas médicas en minutos
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
              Agenda, confirma y da seguimiento a tus pacientes con recordatorios automáticos,
              métricas en tiempo real y una experiencia simple para tu equipo.
            </p>
            <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
              <MetricCard value="↓40%" label="Menos inasistencias" />
              <MetricCard value="3 min" label="Tiempo promedio para agendar" />
              <MetricCard value="100%" label="Gestión digital" />
            </div>
          </div>

          <footer className="relative z-10 hidden text-sm text-white/60 lg:block">
            © {new Date().getFullYear()} AgendaSalud · Hecho en Chile 🇨🇱
          </footer>
        </section>

        {/* ── Panel derecho — formulario ── */}
        <section className="relative flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 12%, rgba(14,165,233,0.10), transparent 35%)',
            }}
          />
          <div className="pointer-events-none absolute right-10 top-10 hidden h-28 w-28 rounded-full bg-emerald-100/50 blur-2xl lg:block" />
          <div className="pointer-events-none absolute bottom-16 left-10 hidden h-32 w-32 rounded-full bg-blue-100/70 blur-2xl lg:block" />

          <div className="relative w-full max-w-[480px]">
            {/* Logo mobile */}
            <div className="mb-7 text-center lg:hidden">
              <div className="mx-auto mb-3 flex justify-center">
                <AgendaSaludLogo dark />
              </div>
              <p className="text-sm font-semibold text-slate-500">AgendaSalud</p>
            </div>

            {/* Card */}
            <div
              className="rounded-[32px] border border-slate-200/80 bg-white p-7 sm:p-9"
              style={{ boxShadow: '0 24px 80px rgba(15,23,42,0.12)' }}
            >
              <div className="mb-8">
                <p className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                  Acceso seguro
                </p>
                <h2 className="text-3xl font-black tracking-tight text-slate-950">
                  Bienvenido
                </h2>
                <p className="mt-2 text-base leading-7 text-slate-500">
                  Ingresa con tu cuenta del centro de salud para continuar al panel.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-800">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@centrodesalud.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base
                               text-slate-950 outline-none transition placeholder:text-slate-400
                               focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label htmlFor="password" className="block text-sm font-bold text-slate-800">
                      Contraseña
                    </label>
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base
                               text-slate-950 outline-none transition placeholder:text-slate-400
                               focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span>⚠</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 flex h-14 w-full items-center justify-center rounded-2xl px-5
                             text-base font-black text-white transition
                             hover:-translate-y-0.5 active:translate-y-0
                             focus:outline-none focus:ring-4 focus:ring-blue-500/20
                             disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background:  loading
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #2563EB 0%, #0891B2 50%, #10B981 100%)',
                    boxShadow:   '0 18px 40px rgba(37,99,235,0.24)',
                  }}
                >
                  {loading ? 'Ingresando...' : (
                    <>
                      Ingresar al panel
                      <span className="ml-2 transition group-hover:translate-x-1">→</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">
                  ¿Necesitas acceso?{' '}
                  <span className="font-black text-blue-700 cursor-pointer hover:text-blue-800 transition">
                    Contacta a tu administrador
                  </span>
                </p>
              </div>
            </div>

            <p className="mt-7 text-center text-sm font-medium text-slate-400">
              Rápido, seguro y pensado para equipos de salud.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-3xl border border-white/15 bg-white/10 px-5 py-5 shadow-sm backdrop-blur-md
                 transition hover:-translate-y-1 hover:bg-white/18"
    >
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-medium leading-5 text-white/70">{label}</p>
    </div>
  )
}

function AgendaSaludLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={[
        'flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg',
        dark
          ? 'bg-[linear-gradient(135deg,#2563EB,#10B981)]'
          : 'bg-white/18 ring-1 ring-white/25 backdrop-blur',
      ].join(' ')}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="4" y="6" width="22" height="20" rx="5" fill="white" fillOpacity={dark ? '0.98' : '0.92'} />
        <path d="M9 5V9M21 5V9" stroke={dark ? '#2563EB' : '#DBEAFE'} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 16H20" stroke={dark ? '#0891B2' : '#2563EB'} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M15 11V21" stroke={dark ? '#0891B2' : '#2563EB'} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="23.5" cy="23.5" r="5.5" fill="#22C55E" />
        <path d="M21.2 23.5L22.8 25.1L26 21.8" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
