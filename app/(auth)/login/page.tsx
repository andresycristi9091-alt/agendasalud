'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8FAFC' }}>

      {/* Panel izquierdo — solo desktop */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)' }}
      >
        {/* Círculos decorativos */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />

        <Logo size="lg" showText mono={false} />

        <div className="relative z-10">
          <h2
            className="text-white mb-4"
            style={{ fontSize: 36, fontWeight: 800, lineHeight: '44px', letterSpacing: '-0.02em' }}
          >
            Gestiona las horas médicas de tu CESFAM
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-10">
            Agenda inteligente, recordatorios automáticos y métricas en tiempo real.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '↓40%', label: 'No-shows' },
              { value: '3 min', label: 'Para agendar' },
              { value: '100%', label: 'Digital' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
              >
                <p className="text-white font-bold text-xl">{s.value}</p>
                <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-sm relative z-10">
          © 2026 AgendaSalud · Hecho en Chile 🇨🇱
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo mobile */}
        <div className="lg:hidden mb-8">
          <Logo size="md" />
        </div>

        <div
          className="w-full max-w-md bg-white rounded-3xl p-8"
          style={{ boxShadow: '0 20px 45px rgba(15,23,42,0.10)', border: '1px solid #E2E8F0' }}
        >
          <div className="mb-8">
            <h1
              className="mb-1"
              style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}
            >
              Bienvenido
            </h1>
            <p style={{ color: '#475569', fontSize: 15 }}>
              Ingresa con tu cuenta del centro de salud
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                className="block mb-1.5"
                style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}
              >
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nombre@cesfam.cl"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 12,
                  fontSize: 15,
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  backgroundColor: '#F8FAFC',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div>
              <label
                className="block mb-1.5"
                style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 12,
                  fontSize: 15,
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  backgroundColor: '#F8FAFC',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563EB')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
              >
                <span>⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#94A3B8' : 'linear-gradient(135deg, #2563EB, #14B8A6)',
                color: 'white',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
                letterSpacing: '0.01em',
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar al panel →'}
            </button>
          </form>

          <p
            className="text-center mt-6"
            style={{ fontSize: 13, color: '#94A3B8' }}
          >
            ¿Necesitas acceso?{' '}
            <span style={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>
              Contacta a tu administrador
            </span>
          </p>
        </div>

        <p className="mt-6 text-xs" style={{ color: '#94A3B8' }}>
          Rápido, seguro y pensado para personas.
        </p>
      </div>
    </div>
  )
}
