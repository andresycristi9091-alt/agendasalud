import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getLocalAdminSessionFromRequest } from '@/lib/auth/local-admin-session'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isDashboard = pathname.startsWith('/dashboard')
  const isLogin = pathname.startsWith('/login')
  // Rutas de autenticacion publicas: no requieren sesion previa (es donde se obtiene)
  const isPublicAuthApi = pathname === '/api/admin/login' || pathname === '/api/admin/bootstrap'
  const isAdminApi =
    !isPublicAuthApi && (pathname.startsWith('/api/admin') || pathname.startsWith('/api/dashboard'))
  const localAdminSession = await getLocalAdminSessionFromRequest(request)

  // Proteger rutas de API que requieren autenticacion
  if (isAdminApi && !user && !localAdminSession) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (isDashboard && !user && !localAdminSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isLogin && (user || localAdminSession)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
