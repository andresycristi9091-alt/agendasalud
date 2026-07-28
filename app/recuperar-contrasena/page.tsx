import { ForgotPasswordPage } from '@/components/auth/ForgotPasswordPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Recuperar contrasena | AgendaSalud',
}

export default function RecuperarContrasenaPage() {
  return (
    <main className="flex min-h-screen items-center bg-slate-50 px-6 py-12">
      <ForgotPasswordPage />
    </main>
  )
}
