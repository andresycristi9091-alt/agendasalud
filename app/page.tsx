import { redirect } from 'next/navigation'
import { getCurrentUserRole } from '@/lib/auth/admin'

export default async function HomePage() {
  const { user } = await getCurrentUserRole()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
