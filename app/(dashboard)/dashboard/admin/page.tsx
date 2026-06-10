import { AdminWorkspace } from '@/components/admin/AdminWorkspace'
import { getCurrentUserRole } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const { isAdmin } = await getCurrentUserRole()
  if (!isAdmin) redirect('/dashboard')

  return <AdminWorkspace />
}
