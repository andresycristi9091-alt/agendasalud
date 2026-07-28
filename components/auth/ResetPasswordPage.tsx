'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  token: string
}

export function ResetPasswordPage({ token }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const hasToken = token.length > 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error ?? 'No pudimos actualizar la contrasena. Intenta nuevamente.')
        return
      }

      setMessage(data.message ?? 'Contrasena actualizada. Ya puedes iniciar sesion.')
      setPassword('')
      setConfirmPassword('')
    } catch {
      setError('Error de conexion. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Nueva contrasena</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Restablecer contrasena</h1>

        {!hasToken ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              El enlace no incluye un codigo de recuperacion valido. Solicita uno nuevo.
            </div>
            <Link
              href="/recuperar-contrasena"
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Crea una nueva contrasena de al menos 8 caracteres, con una mayuscula y un numero.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-800">
                  Nueva contrasena
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold text-slate-800">
                  Repite la contrasena
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#0891B2_50%,#10B981_100%)] px-5 text-base font-black text-white shadow-[0_18px_40px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Guardando...' : 'Guardar nueva contrasena'}
              </button>
            </form>
          </>
        )}

        {message && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              Ir a iniciar sesion
            </Link>
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
