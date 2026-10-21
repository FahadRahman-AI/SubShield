import { after, NextResponse, type NextRequest } from 'next/server'
import { verifyPlaidWebhook } from '@/lib/integrations/plaid'
import { features } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/server'
import { syncUser } from '@/lib/sync/sync-user'

// Live monitoring: Plaid tells us when an Item has new transactions.
// Every request is verified (ES256 JWT over the SHA-256 of the raw body).
export async function POST(request: NextRequest) {
  if (!features.plaid || !features.supabase) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  const raw = await request.text()
  if (!(await verifyPlaidWebhook(raw, request.headers.get('plaid-verification')))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(raw) as { webhook_type: string; webhook_code: string; item_id: string; error?: { error_code?: string } }
  const admin = createAdminClient()
  const { data: conn } = await admin.from('app_connections').select('id, user_id').eq('item_id', event.item_id).maybeSingle()
  if (!conn) return NextResponse.json({ ok: true, ignored: 'unknown item' })

  if (event.webhook_type === 'TRANSACTIONS' && event.webhook_code === 'SYNC_UPDATES_AVAILABLE') {
    // Acknowledge fast; Plaid retries slow webhooks.
    after(() => syncUser(conn.user_id, { connectionId: conn.id }).then(() => undefined).catch((err) => console.error('[plaid webhook] sync', err)))
  } else if (event.webhook_type === 'ITEM' && ['ERROR', 'PENDING_EXPIRATION', 'PENDING_DISCONNECT', 'USER_PERMISSION_REVOKED'].includes(event.webhook_code)) {
    await admin
      .from('app_connections')
      .update({ status: 'error', error_code: event.error?.error_code ?? event.webhook_code })
      .eq('id', conn.id)
  }
  return NextResponse.json({ ok: true })
}
