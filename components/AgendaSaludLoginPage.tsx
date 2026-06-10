'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type AuthMode = 'options' | 'password'

export default function AgendaSaludLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('options')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const expiredLink = window.location.hash.includes('otp_expired') || window.location.search.includes('otp_expired')
    return expiredLink ? 'El enlace del correo expiro o ya fue usado. Solicita un nuevo acceso.' : null
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const hash = window.location.hash
    const query = window.location.search
    if (hash.includes('otp_expired') || query.includes('otp_expired')) window.history.replaceState(null, '', '/login')
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    const loginEmail = email.trim()

    // Intentar login via ruta unificada (admin hardcodeado + usuarios internos Sheets)
    const adminLogin = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.toLowerCase(), password }),
    })

    if (adminLogin.ok) {
      window.location.assign('/dashboard')
      return
    }

    // Intentar Supabase Auth
    const { error: supabaseError } = await supabase.auth.signInWithPassword({ email: loginEmail, password })

    if (!supabaseError) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    // Intentar usuarios internos de Sheets (fallback)
    const internalLogin = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password }),
    })

    if (internalLogin.ok) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    setError('Correo o contrasena incorrectos. Verifica tus credenciales.')
    setLoading(false)
  }

  async function sendEmailAccess() {
    const loginEmail = email.trim().toLowerCase()
    setError(null)
    setNotice(null)

    if (!loginEmail) {
      setError('Ingresa tu correo profesional para enviar el acceso.')
      return
    }

    setLoading(true)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: { emailRedirectTo: redirectTo },
    })
    setLoading(false)

    if (otpError) {
      setError('No pudimos enviar el acceso por email. Intenta con contrasena.')
      return
    }

    setNotice('Te enviamos un acceso seguro al correo profesional. Revisa tu bandeja de entrada o spam.')
  }

  function requestWhatsAppCode() {
    setError(null)
    setNotice('Acceso por WhatsApp preparado para integrar. Falta conectar proveedor oficial de WhatsApp Business.')
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative flex min-h-[52vh] flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.24),transparent_30%),linear-gradient(135deg,#1D4ED8_0%,#0891B2_48%,#10B981_100%)] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-16">
          <div className="pointer-events-none absolute -left-24 bottom-[-140px] h-96 w-96 rounded-full bg-white/10 blur-sm" />
          <div className="pointer-events-none absolute right-[-140px] top-[-130px] h-[460px] w-[460px] rounded-full bg-white/10 blur-sm" />
          <div className="pointer-events-none absolute left-[58%] top-[18%] h-56 w-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute left-[8%] top-[62%] h-24 w-24 rounded-full border border-white/10" />

          <header className="relative z-10 flex items-center gap-3">
            <AgendaSaludLogo />
            <div>
              <p className="text-xl font-black tracking-tight">Agenda<span className="text-emerald-200">Salud</span></p>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">Health scheduling</p>
            </div>
          </header>

          <div className="relative z-10 max-w-3xl py-14 lg:py-0">
            <div className="mb-5 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur">
              Plataforma inteligente para centros de salud
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Te ayudamos a gestionar tus horas medicas en minutos
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">
              Agenda, confirma y da seguimiento a tus pacientes con recordatorios automaticos,
              metricas en tiempo real y una experiencia simple para tu equipo.
            </p>
            <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
              <MetricCard value="-40%" label="Menos inasistencias" />
              <MetricCard value="3 min" label="Tiempo promedio para agendar" />
              <MetricCard value="100%" label="Gestion digital" />
            </div>
          </div>

          <footer className="relative z-10 hidden text-sm text-white/60 lg:block">
            © {new Date().getFullYear()} AgendaSalud · Hecho en Chile
          </footer>
        </section>

        <section className="relative flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(14,165,233,0.10),transparent_35%)]" />
          <div className="pointer-events-none absolute right-10 top-10 hidden h-28 w-28 rounded-full bg-emerald-100/50 blur-2xl lg:block" />
          <div className="pointer-events-none absolute bottom-16 left-10 hidden h-32 w-32 rounded-full bg-blue-100/70 blur-2xl lg:block" />

          <div className="relative w-full max-w-[520px]">
            <div className="mb-7 text-center lg:hidden">
              <div className="mx-auto mb-3 flex justify-center"><AgendaSaludLogo dark /></div>
              <p className="text-sm font-semibold text-slate-500">AgendaSalud</p>
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-9">
              <div className="mb-8 text-center">
                <p className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                  Acceso profesional
                </p>
                <h2 className="text-3xl font-black tracking-tight text-slate-950">Iniciar sesion</h2>
                <p className="mt-3 text-base leading-7 text-slate-500">
                  Ingresa con tu cuenta del centro de salud para continuar al panel profesional.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-800">Correo profesional</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="profesional@centro.cl"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {authMode === 'options' && (
                  <div className="space-y-3">
                    <button type="button" onClick={requestWhatsAppCode} disabled={loading} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-5 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:opacity-60">
                      <span aria-hidden="true">☎</span>
                      Codigo via WhatsApp
                    </button>
                    <button type="button" onClick={sendEmailAccess} disabled={loading} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-teal-700 px-5 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-teal-800 disabled:opacity-60">
                      <span aria-hidden="true">✉</span>
                      Codigo via Email
                    </button>
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-sm font-semibold text-slate-500">O si no</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <button type="button" onClick={() => setAuthMode('password')} className="flex h-14 w-full items-center justify-center rounded-2xl border border-teal-700 bg-white px-5 text-base font-black text-teal-700 transition hover:-translate-y-0.5 hover:bg-teal-50">
                      Ingresar con contrasena
                    </button>
                  </div>
                )}

                {authMode === 'password' && (
                  <form action="/api/admin/login" method="post" onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <label htmlFor="password" className="block text-sm font-bold text-slate-800">Contrasena</label>
                        <button type="button" onClick={() => setAuthMode('options')} className="text-sm font-black text-blue-700 transition hover:text-blue-800">
                          Ver opciones
                        </button>
                      </div>
                      <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Ingresa tu contrasena"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                    <button type="submit" disabled={loading} className="group mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#0891B2_50%,#10B981_100%)] px-5 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60">
                      {loading ? 'Ingresando...' : <>Ingresar al panel<span className="ml-2 transition group-hover:translate-x-1">→</span></>}
                    </button>
                  </form>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span aria-hidden="true">!</span> {error}
                  </div>
                )}
                {notice && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {notice}
                  </div>
                )}
              </div>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">
                  ¿Necesitas acceso? <span className="cursor-pointer font-black text-blue-700 transition hover:text-blue-800">Contacta a tu administrador</span>
                </p>
              </div>
            </div>

            <p className="mt-7 text-center text-sm font-medium text-slate-400">
              Rapido, seguro y pensado para equipos de salud.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-5 shadow-sm backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/18">
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-medium leading-5 text-white/70">{label}</p>
    </div>
  )
}

function AgendaSaludLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={[
      'flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg',
      dark ? 'bg-[linear-gradient(135deg,#2563EB,#10B981)]' : 'bg-white/18 ring-1 ring-white/25 backdrop-blur',
    ].join(' ')}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
