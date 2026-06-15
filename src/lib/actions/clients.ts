'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createClientAction(
  input: { name: string; nip?: string; hubspot_url?: string }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Nie jesteś zalogowany.' }
  }

  // Walidacja serwerowa
  const name = (input.name ?? '').trim()
  if (name.length === 0) return { error: 'Nazwa nie może być pusta.' }
  if (name.length > 200) return { error: 'Nazwa jest za długa (max 200 znaków).' }

  const nip = (input.nip ?? '').trim() || null
  if (nip && nip.length > 200) return { error: 'NIP jest za długi (max 200 znaków).' }

  const hubspot_url = (input.hubspot_url ?? '').trim() || null
  if (hubspot_url && hubspot_url.length > 200) {
    return { error: 'URL HubSpot jest za długi (max 200 znaków).' }
  }

  const { data, error: insertError } = await supabase
    .from('clients')
    .insert({ name, nip, hubspot_url })
    .select('id')
    .single()

  if (insertError || !data) {
    console.error('[createClientAction] insert failed:', insertError)
    return { error: 'Nie udało się utworzyć klienta. Spróbuj ponownie.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/projekty')

  return { ok: true, id: data.id }
}
