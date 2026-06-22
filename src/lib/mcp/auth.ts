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
    .select('id, user_id, profiles!inner(is_active)')
    .eq('token', token)
    .is('revoked_at', null)
    .single()

  if (error || !data) return null

  // H-1: sprawdź czy właściciel tokenu nie został dezaktywowany
  const profilesField = data.profiles
  const profile = Array.isArray(profilesField)
    ? (profilesField[0] as { is_active: boolean } | undefined)
    : (profilesField as { is_active: boolean } | null)
  if (profile?.is_active === false) return null

  return { userId: data.user_id, tokenId: data.id }
}
