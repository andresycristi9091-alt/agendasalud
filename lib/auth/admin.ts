import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLocalAdminSession, LOCAL_ADMIN_EMAIL } from '@/lib/auth/local-admin-session'

const FALLBACK_ADMIN_EMAILS = ['andresycristi9091@gmail.com', 'admin@agendasalud.cl']

export function getAdminEmails() {
  const configured = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean) ?? []
  return Array.from(new Set([...configured, ...FALLBACK_ADMIN_EMAILS]))
}

export async function getCurrentUserRole() {
  const localAdminSession = await getLocalAdminSession()
  if (localAdminSession) {
    return {
      user: {
        id: 'local-admin',
        email: LOCAL_ADMIN_EMAIL,
        user_metadata: {
          name: 'Administrador AgendaSalud',
          role: 'admin',
          centerId: '',
        },
      },
      role: 'admin' as const,
      isAdmin: true,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return { user: null, role: 'anonymous' as const, isAdmin: false }

  const metadataRole = String(user.user_metadata?.role ?? '').toLowerCase()
  const email = user.email.toLowerCase()
  const isAdmin = metadataRole === 'admin' || getAdminEmails().includes(email)

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
