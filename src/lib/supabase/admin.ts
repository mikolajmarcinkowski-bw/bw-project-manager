import { createClient } from '@supabase/supabase-js'

// Admin client z service_role — tylko server-side (API routes, MCP server)
// NIGDY nie eksportuj do komponentów klienta
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
