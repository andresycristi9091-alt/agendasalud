import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="font-semibold text-slate-900 text-sm">Sami Salud</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard/agenda"
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900
                         hover:bg-slate-100 rounded-md transition-colors">
              Agenda
            </Link>
            <Link href="/dashboard/nueva-cita"
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900
                         hover:bg-slate-100 rounded-md transition-colors">
              Nueva Cita
            </Link>
            <Link href="/dashboard/configuracion"
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900
                         hover:bg-slate-100 rounded-md transition-colors">
              Configuración
            </Link>
          </nav>
        </div>
        <span className="text-xs text-slate-400">{user.email}</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
