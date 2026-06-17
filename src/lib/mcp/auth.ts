import { createAdminClient } from '@/lib/supabase/admin'

export interface McpUser {
  userId: string
  tokenId: string
}

/**
 * Weryfikuje Bearer token MCP z nagłówka Authorization.
 * Używa admin client (service_role) — nie wymaga sesji Supabase.
 */
export async function verifyMcpToken(
  authHeader: string | null
): Promise<McpUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_tokens')
    .select('id, user_id')
    .eq('token', token)
    .is('revoked_at', null)
    .single()

  if (error || !data) return null
  return { userId: data.user_id, tokenId: data.id }
}
