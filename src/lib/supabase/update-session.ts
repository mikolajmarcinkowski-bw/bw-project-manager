import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Odświeża sesję Supabase w Proxy (Next 16 — następca middleware).
 * Wzorzec @supabase/ssr: czytamy cookies z request, zapisujemy do request+response.
 * NIE wstawiać logiki między createServerClient a getClaims — ryzyko wylogowań.
 *
 * Trasy publiczne (bez sesji): /login, /auth/*. Reszta wymaga zalogowania.
 */
const PUBLIC_PATHS = ['/login', '/auth']

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

  // WAŻNE: getClaims/getUser tuż po utworzeniu klienta (odświeża token w cookies).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`)
  )

  // Przekierowanie z zachowaniem odświeżonych ciasteczek sesji
  // (bez kopiowania getUser() mógł zrotować token → losowe wylogowania).
  const redirectTo = (pathname: string, withParam = false) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ''
    if (withParam) url.searchParams.set('redirectTo', path)
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }

  if (!user && !isPublic) return redirectTo('/login', true)

  // Zalogowany na /login → przekieruj na dashboard.
  if (user && path === '/login') return redirectTo('/dashboard')

  return supabaseResponse
}
