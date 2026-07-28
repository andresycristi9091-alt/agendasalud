import { ResetPasswordPage } from '@/components/auth/ResetPasswordPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Restablecer contrasena | AgendaSalud',
}

type Props = {
  searchParams: Promise<{ token?: string }>
}

export default async function RestablecerContrasenaPage({ searchParams }: Props) {
  const params = await searchParams
  const token = String(params.token ?? '').trim()

  return (
    <main className="flex min-h-screen items-center bg-slate-50 px-6 py-12">
      <ResetPasswordPage token={token} />
    </main>
  )
}
