import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { getCurrentUserRole } from '@/lib/auth/admin'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin } = await getCurrentUserRole()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Logo size="sm" />
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              <Link href="/dashboard" className="nav-link rounded-xl px-3 py-2 text-sm font-bold">
                Panel profesional
              </Link>
              <Link href="/dashboard/perfil" className="nav-link rounded-xl px-3 py-2 text-sm font-bold">
                Perfil
              </Link>
              {isAdmin && (
                <Link href="/dashboard/admin" className="nav-link rounded-xl px-3 py-2 text-sm font-bold">
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB,#14B8A6)] text-xs font-black text-white">
                {user.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="max-w-[140px] truncate text-xs font-semibold text-slate-600">{user.email}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
