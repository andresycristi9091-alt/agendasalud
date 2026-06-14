import { redirect } from 'next/navigation'
import { getCurrentUserRole } from '@/lib/auth/admin'
import { LandingPage } from '@/components/public/LandingPage'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { user } = await getCurrentUserRole()

  if (user) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
