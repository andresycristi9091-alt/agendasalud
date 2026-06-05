import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { LogoutButton } from '@/components/ui/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Logo size="sm" />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard/agenda"
                className="nav-link flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium">
                <span>📅</span> Agenda
              </Link>
              <Link href="/dashboard/citas"
                className="nav-link flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium">
                <span>📋</span> Citas
              </Link>
              <Link href="/dashboard/disponibilidad"
                className="nav-link flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium">
                <span>🗓</span> Disponibilidad
              </Link>
              <Link href="/dashboard/nueva-cita"
                className="nav-link flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium">
                <span>➕</span> Nueva Cita
              </Link>
              <Link href="/dashboard/configuracion"
                className="nav-link flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium">
                <span>⚙️</span> Config
              </Link>
            </nav>
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #2563EB, #14B8A6)' }}
              >
                {user.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-xs font-medium" style={{ color: '#475569', maxWidth: 140 }}>
                {user.email}
              </span>
            </div>
            <LogoutButton />
          </div>

        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
