'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'linkSent' | 'password' | 'done'
type Mode = 'direct' | 'email'

export function ProfilePasswordPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('direct')
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false)
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/me')
      .then((response) => response.json())
      .then((data) => {
        if (data?.user?.email) setEmail(data.user.email)
      })
      .catch(() => null)

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasSupabaseSession(true)
        if (window.location.search.includes('reset=1')) {
          setMode('email')
          setStep('password')
          setMessage('Enlace verificado. Ahora puedes crear una nueva contrasena.')
        }
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('email')
        setStep('password')
        setMessage('Enlace verificado. Ahora puedes crear una nueva contrasena.')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [supabase.auth])

  async function changePasswordDirect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 8) {
      setError('La nueva contrasena debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    setLoading(true)

    if (hasSupabaseSession) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
      if (signInError) {
        setLoading(false)
        setError('La clave actual es incorrecta.')
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password })
      setLoading(false)
      if (updateError) {
        setError('No pudimos actualizar la contrasena. Intenta nuevamente.')
        return
      }
    } else {
      const response = await fetch('/api/dashboard/professionals/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword: password }),
      })
      setLoading(false)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error ?? 'No pudimos actualizar la contrasena.')
        return
      }
    }

    setCurrentPassword('')
    setPassword('')
    setConfirmPassword('')
    setMessage('Contrasena actualizada correctamente. Ya puedes usarla en tu proximo inicio de sesion.')
  }

  async function sendRecoveryLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    const publicBaseUrl = window.location.hostname === 'localhost'
      ? 'https://agendasalud.vercel.app'
      : window.location.origin
    const redirectTo = `${publicBaseUrl}/auth/callback?next=${encodeURIComponent('/cambiar-contrasena?reset=1')}`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    })

    setLoading(false)

    if (resetError) {
      setError('No pudimos enviar el enlace. Verifica que el correo exista en la plataforma y que el enlace de retorno este autorizado.')
      return
    }

    setEmail(normalizedEmail)
    setStep('linkSent')
    setMessage('Te enviamos un enlace seguro al correo indicado. Abre el enlace para definir una nueva contrasena.')
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 8) {
      setError('La nueva contrasena debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('No pudimos actualizar la contrasena. Abre nuevamente el enlace del correo e intenta otra vez.')
      return
    }

    setPassword('')
    setConfirmPassword('')
    setStep('done')
    setMessage('Contrasena actualizada correctamente. Ya puedes usarla en tu proximo inicio de sesion.')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#1D4ED8_0%,#0891B2_52%,#10B981_100%)] p-7 text-white shadow-[0_24px_80px_rgba(37,99,235,0.20)] sm:p-9">
        <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/85">
          Perfil de usuario
        </p>
        <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          Cambiar contrasena
        </h1>
        {email && (
          <p className="mt-3 text-base leading-7 text-white/78">Cuenta: <strong>{email}</strong></p>
        )}
      </section>

      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => { setMode('direct'); setMessage(null); setError(null) }}
          className={[
            'flex-1 rounded-xl py-2.5 text-sm font-black transition',
            mode === 'direct' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-800',
          ].join(' ')}
        >
          Cambio directo
        </button>
        <button
          type="button"
          onClick={() => { setMode('email'); setMessage(null); setError(null) }}
          className={[
            'flex-1 rounded-xl py-2.5 text-sm font-black transition',
            mode === 'email' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-800',
          ].join(' ')}
        >
          Por correo
        </button>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-8">
          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {mode === 'direct' && (
            <form onSubmit={changePasswordDirect} className="space-y-5">
              <Field label="Clave actual">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Tu clave actual"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Nueva contrasena">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 8 caracteres"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Repetir nueva contrasena">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirma tu nueva contrasena"
                  className={inputClass}
                  required
                />
              </Field>
              <PrimaryButton loading={loading}>Actualizar contrasena</PrimaryButton>
            </form>
          )}

          {mode === 'email' && (
            <>
              {step === 'email' && (
                <form onSubmit={sendRecoveryLink} className="space-y-5">
                  <p className="text-sm text-slate-500">Te enviaremos un enlace al correo. Abrelo y podras definir una nueva clave.</p>
                  <Field label="Correo electronico">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nombre@centrodesalud.cl"
                      className={inputClass}
                      required
                    />
                  </Field>
                  <PrimaryButton loading={loading}>Enviar enlace seguro</PrimaryButton>
                </form>
              )}

              {step === 'linkSent' && (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                  <p className="text-lg font-black text-blue-800">Revisa tu correo</p>
                  <p className="mt-2 text-sm leading-6 text-blue-700">
                    Abre el enlace que te enviamos y podras crear una nueva contrasena.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setMessage(null); setError(null) }}
                    className="mt-5 h-12 rounded-2xl border border-blue-200 bg-white px-5 text-sm font-black text-blue-700 transition hover:bg-blue-50"
                  >
                    Reenviar
                  </button>
                </div>
              )}

              {step === 'password' && (
                <form onSubmit={updatePassword} className="space-y-5">
                  <Field label="Nueva contrasena">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimo 8 caracteres"
                      className={inputClass}
                      required
                    />
                  </Field>
                  <Field label="Repetir nueva contrasena">
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirma tu nueva contrasena"
                      className={inputClass}
                      required
                    />
                  </Field>
                  <PrimaryButton loading={loading}>Actualizar contrasena</PrimaryButton>
                </form>
              )}

              {step === 'done' && (
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
                  <p className="text-lg font-black text-emerald-800">Cambio completado</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-700">
                    Tu contrasena fue actualizada.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Seguridad</p>
          <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950">Recomendaciones</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
            <li>Usa al menos 8 caracteres.</li>
            <li>No reutilices claves personales.</li>
            <li>Cambia la clave inicial que te dio el admin.</li>
            <li>Si olvidaste tu clave, usa la opcion "Por correo".</li>
          </ul>
        </aside>
      </section>
    </div>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: 'email', label: 'Correo' },
    { key: 'linkSent', label: 'Enlace' },
    { key: 'password', label: 'Nueva clave' },
  ] satisfies Array<{ key: Step; label: string }>

  const activeIndex = steps.findIndex((item) => item.key === step)

  return (
    <div className="mb-6 grid gap-2 sm:grid-cols-3">
      {steps.map((item, index) => {
        const active = step === 'done' || index <= activeIndex
        return (
          <div
            key={item.key}
            className={[
              'rounded-2xl border px-4 py-3 text-sm font-black',
              active ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-400',
            ].join(' ')}
          >
            {index + 1}. {item.label}
          </div>
        )
      })}
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

function PrimaryButton({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="h-13 w-full rounded-2xl bg-[linear-gradient(135deg,#2563EB,#0891B2)] px-5 text-sm font-black text-white shadow-[0_16px_35px_rgba(37,99,235,0.20)] transition hover:-translate-y-0.5 disabled:opacity-50"
    >
      {loading ? 'Procesando...' : children}
    </button>
  )
}

const inputClass =
  'h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'
