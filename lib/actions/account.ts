'use server'

import { redirect } from 'next/navigation'
import { requireViewer } from '@/lib/auth'
import { decryptToken } from '@/lib/crypto'
import { clearDemoState } from '@/lib/demo/state'
import { features } from '@/lib/env'
import { removeItem } from '@/lib/integrations/plaid'
import { stripe } from '@/lib/integrations/stripe'
import { DELETE_CONFIRMATION } from '@/lib/legal'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/**
 * Right to erasure. Order matters:
 *   1. stop billing — if Stripe can't be cancelled, abort before deleting
 *      anything, so nobody is charged for an account that no longer exists;
 *   2. revoke third-party access (Plaid items, Google tokens);
 *   3. delete the auth user — every table cascades from profiles.
 */
export async function deleteAccount(input: { confirm: string }): Promise<{ ok: false; error: string }> {
  const viewer = await requireViewer()
  if (input.confirm !== DELETE_CONFIRMATION) return { ok: false, error: `Type ${DELETE_CONFIRMATION} to confirm.` }

  if (viewer.mode === 'demo') {
    await clearDemoState()
    redirect('/?account=deleted')
  }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', viewer.id).single()

  if (profile?.stripe_customer_id) {
    if (!features.stripe) return { ok: false, error: 'Billing is unavailable right now, so your subscription can’t be cancelled. Nothing was deleted.' }
    try {
      // Deleting the customer cancels every active subscription immediately.
      await stripe().customers.del(profile.stripe_customer_id)
    } catch (err) {
      console.error('[account] stripe customer delete', err)
      return { ok: false, error: 'We couldn’t cancel your Pro billing, so nothing was deleted. Please try again or contact support.' }
    }
  }

  const { data: connections } = await admin.from('app_connections').select('provider, access_token, refresh_token').eq('user_id', viewer.id)
  for (const c of connections ?? []) {
    try {
      if (c.provider === 'plaid') await removeItem(decryptToken(c.access_token))
      if (c.provider === 'google') {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decryptToken(c.refresh_token ?? c.access_token))}`, { method: 'POST' })
      }
    } catch (err) {
      // The data is erased below either way; a failed revoke only leaves a dead token with the provider.
      console.error('[account] revoke', c.provider, err)
    }
  }

  const { error } = await admin.auth.admin.deleteUser(viewer.id)
  if (error) {
    console.error('[account] delete user', error)
    return { ok: false, error: 'Your billing and connections were cancelled, but deleting your data failed. Contact support and we’ll finish it.' }
  }

  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // The session belongs to a user that no longer exists; clearing it is best-effort.
  }
  redirect('/?account=deleted')
}
