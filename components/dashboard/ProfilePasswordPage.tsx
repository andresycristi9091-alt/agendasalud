'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'code' | 'password' | 'done'

export function ProfilePasswordPage() {
  const supabase = createClient()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
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
  }, [])

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    })

    setLoading(false)

    if (otpError) {
      setError('No pudimos enviar el codigo. Verifica que el correo exista en la plataforma.')
      return
    }

    setEmail(normalizedEmail)
    setStep('code')
    setMessage('Te enviamos un codigo al correo indicado. Revisa tambien spam o promociones.')
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })

    setLoading(false)

    if (verifyError) {
      setError('El codigo no es valido o ya expiro. Solicita uno nuevo e intenta otra vez.')
      return
    }

    setStep('password')
    setMessage('Codigo verificado. Ahora puedes crear una nueva contrasena.')
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
      setError('No pudimos actualizar la contrasena. Vuelve a verificar el codigo.')
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
          Cambia tu contrasena con verificacion por correo
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
          Para proteger la cuenta, enviaremos un codigo al correo registrado antes de permitir el cambio.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-8">
          <StepIndicator step={step} />

          {message && (
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={sendCode} className="space-y-5">
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
              <PrimaryButton loading={loading}>Enviar codigo</PrimaryButton>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyCode} className="space-y-5">
              <Field label="Codigo recibido">
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Ingresa el codigo de tu correo"
                  className={inputClass}
                  required
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <PrimaryButton loading={loading}>Verificar codigo</PrimaryButton>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setCode('')
                    setMessage(null)
                    setError(null)
                  }}
                  className="h-13 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Cambiar correo
                </button>
              </div>
            </form>
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
                Tu contrasena fue actualizada. Puedes seguir trabajando o cerrar sesion y volver a entrar con la nueva clave.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setMessage(null)
                }}
                className="mt-5 h-12 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                Cambiar otra vez
              </button>
            </div>
          )}
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Seguridad</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Recomendaciones</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
            <li>Usa al menos 8 caracteres.</li>
            <li>No reutilices claves personales.</li>
            <li>El codigo vence por seguridad.</li>
            <li>Si no llega el correo, revisa spam o solicita un nuevo codigo.</li>
          </ul>
        </aside>
      </section>
    </div>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: 'email', label: 'Correo' },
    { key: 'code', label: 'Codigo' },
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
