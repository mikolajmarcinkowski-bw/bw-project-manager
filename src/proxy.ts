import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/update-session'

// Next 16: `proxy` zastępuje `middleware`. Odświeża sesję Supabase i chroni trasy.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Pomijamy assety i API (API authenticuje się samodzielnie — MCP per-user token).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
