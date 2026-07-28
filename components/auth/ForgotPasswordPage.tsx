'use client'

import { useState } from 'react'
import Link from 'next/link'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error ?? 'No pudimos procesar la solicitud. Intenta nuevamente.')
        return
      }

      setMessage(data.message ?? 'Si el correo existe, enviaremos instrucciones.')
    } catch {
      setError('Error de conexion. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Recuperar acceso</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Olvidaste tu contrasena?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ingresa el correo de tu cuenta AgendaSalud y te enviaremos un enlace para crear una nueva contrasena.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-800">
              Correo electronico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.cl"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#0891B2_50%,#10B981_100%)] px-5 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Enviando...' : 'Enviar enlace de recuperacion'}
          </button>
        </form>

        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-500">
            Recordaste tu clave?{' '}
            <Link href="/login" className="font-black text-blue-700 transition hover:text-blue-800">
              Volver al inicio de sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
