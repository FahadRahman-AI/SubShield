'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { requireViewer } from '@/lib/auth'
import { decryptToken, encryptToken } from '@/lib/crypto'
import { writeDemoState } from '@/lib/demo/state'
import { features } from '@/lib/env'
import { createLinkToken, exchangePublicToken, removeItem } from '@/lib/integrations/plaid'
import { createAdminClient } from '@/lib/supabase/server'
import { syncUser } from '@/lib/sync/sync-user'

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

export async function createPlaidLinkToken(): Promise<Result<string>> {
  const viewer = await requireViewer()
  if (viewer.mode === 'demo') return { ok: true, data: 'demo' }
  if (!features.plaid) return { ok: false, error: 'Bank connections aren’t configured yet (missing PLAID_CLIENT_ID / PLAID_SECRET).' }
  try {
    return { ok: true, data: await createLinkToken(viewer.id) }
  } catch (err) {
    console.error('[plaid] link token', err)
    return { ok: false, error: 'Couldn’t start the bank connection. Please try again.' }
  }
}

const ExchangeInput = z.object({ publicToken: z.string().min(10).max(500), institution: z.string().max(120).nullable() })

export async function connectBank(input: z.infer<typeof ExchangeInput>): Promise<Result<{ subscriptions: number }>> {
  const viewer = await requireViewer()
  // No refresh() here: the client refreshes once its scan animation finishes.
  if (viewer.mode === 'demo') {
    await writeDemoState({ connected: true })
    return { ok: true, data: { subscriptions: 20 } }
  }
  const parsed = ExchangeInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid connection payload.' }

  try {
    const { accessToken, itemId } = await exchangePublicToken(parsed.data.publicToken)
    const admin = createAdminClient()
    const { data: conn, error } = await admin
      .from('app_connections')
      .upsert(
        { user_id: viewer.id, provider: 'plaid', access_token: encryptToken(accessToken), item_id: itemId, institution_name: parsed.data.institution, status: 'active' },
        { onConflict: 'item_id' },
      )
      .select('id')
      .single()
    if (error) throw error

    // Plaid may need a few seconds to pull history on a brand-new item.
    let result = await syncUser(viewer.id, { connectionId: conn.id })
    for (let i = 0; i < 3 && result.plaidStatus === 'NOT_READY'; i++) {
      await new Promise((r) => setTimeout(r, 2500))
      result = await syncUser(viewer.id, { connectionId: conn.id })
    }
    return { ok: true, data: { subscriptions: result.subscriptions } }
  } catch (err) {
    console.error('[plaid] exchange', err)
    return { ok: false, error: 'We couldn’t finish connecting that account. Please try again.' }
  }
}

export async function connectDemoMailbox(): Promise<Result> {
  const viewer = await requireViewer()
  if (viewer.mode !== 'demo') return { ok: false, error: 'Not available.' }
  await writeDemoState({ emailConnected: true })
  refresh()
  return { ok: true }
}

export async function resyncNow(): Promise<Result<{ subscriptions: number }>> {
  const viewer = await requireViewer()
  if (viewer.mode === 'demo') {
    refresh()
    return { ok: true, data: { subscriptions: 20 } }
  }
  try {
    const result = await syncUser(viewer.id)
    refresh()
    return { ok: true, data: { subscriptions: result.subscriptions } }
  } catch (err) {
    console.error('[sync] manual', err)
    return { ok: false, error: 'Sync failed. Please try again in a minute.' }
  }
}

export async function disconnect(connectionId: string): Promise<Result> {
  const viewer = await requireViewer()
  if (viewer.mode === 'demo') {
    await writeDemoState(connectionId === 'demo-google' ? { emailConnected: false } : { connected: false, emailConnected: false, statuses: {}, sent: {} })
    refresh()
    return { ok: true }
  }
  const admin = createAdminClient()
  const { data: conn } = await admin.from('app_connections').select('*').eq('id', connectionId).eq('user_id', viewer.id).maybeSingle()
  if (!conn) return { ok: false, error: 'Connection not found.' }

  if (conn.provider === 'plaid') {
    await removeItem(decryptToken(conn.access_token)).catch((err) => console.error('[plaid] item remove', err))
  } else if (conn.provider === 'google') {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decryptToken(conn.refresh_token ?? conn.access_token))}`, { method: 'POST' }).catch(() => null)
  }
  // Deleting the row cascades to its transactions / email signals (data minimisation).
  await admin.from('app_connections').delete().eq('id', conn.id)
  await syncUser(viewer.id).catch(() => null)
  refresh()
  return { ok: true }
}
