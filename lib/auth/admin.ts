import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLocalAdminSession, LOCAL_ADMIN_EMAIL } from '@/lib/auth/local-admin-session'

export function getAdminEmails() {
  const configured = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean) ?? []
  if (configured.length === 0) {
    throw new Error('ADMIN_EMAILS no esta configurado. Define al menos un correo admin en las variables de entorno.')
  }
  return configured
}

export async function getCurrentUserRole() {
  const localAdminSession = await getLocalAdminSession()
  if (localAdminSession) {
    return {
      user: {
        id: localAdminSession.email === LOCAL_ADMIN_EMAIL ? 'local-admin' : `local-${localAdminSession.email}`,
        email: localAdminSession.email,
        user_metadata: {
          name: localAdminSession.name || (localAdminSession.email === LOCAL_ADMIN_EMAIL ? 'Administrador AgendaSalud' : ''),
          role: localAdminSession.role,
          centerId: localAdminSession.centerId || '',
        },
      },
      role: localAdminSession.role,
      isAdmin: localAdminSession.role === 'admin',
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
