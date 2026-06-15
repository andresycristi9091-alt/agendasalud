import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLocalAdminSession, LOCAL_ADMIN_EMAIL } from '@/lib/auth/local-admin-session'

export function isPrimaryAdminEmail(email?: string | null) {
  return String(email ?? '').trim().toLowerCase() === LOCAL_ADMIN_EMAIL
}

export function getAdminEmails() {
  return process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean) ?? []
}

export async function getCurrentUserRole() {
  const localAdminSession = await getLocalAdminSession()
  if (localAdminSession) {
    const isPrimaryAdmin = isPrimaryAdminEmail(localAdminSession.email)
    const role = isPrimaryAdmin && localAdminSession.role === 'admin' ? 'admin' as const : 'user' as const
    return {
      user: {
        id: localAdminSession.email === LOCAL_ADMIN_EMAIL ? 'local-admin' : `local-${localAdminSession.email}`,
        email: localAdminSession.email,
        user_metadata: {
          name: localAdminSession.name || (localAdminSession.email === LOCAL_ADMIN_EMAIL ? 'Administrador AgendaSalud' : ''),
          role,
          centerId: localAdminSession.centerId || '',
        },
      },
      role,
      isAdmin: role === 'admin',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return { user: null, role: 'anonymous' as const, isAdmin: false }

  const email = user.email.toLowerCase()
  const isAdmin = isPrimaryAdminEmail(email)

  return {
    user,
    role: isAdmin ? 'admin' as const : 'user' as const,
    isAdmin,
  }
}

export async function requireAdmin() {
  const context = await getCurrentUserRole()
  if (!context.isAdmin) throw new Error('No autorizado')
  return context
}

export function createAdminSupabaseClient() {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRole) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  }

  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRole,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
