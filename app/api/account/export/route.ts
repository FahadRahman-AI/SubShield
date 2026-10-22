import { NextResponse } from 'next/server'
import { getViewer } from '@/lib/auth'
import { getDashboard } from '@/lib/data/dashboard'
import { createAdminClient } from '@/lib/supabase/server'

// Right of access / data portability: everything we hold about the signed-in
// user, as one JSON file. Tokens and internal secrets are never included.

const PAGE = 1000

export async function GET() {
  const viewer = await getViewer()
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const exportedAt = new Date().toISOString()
  let payload: Record<string, unknown>

  if (viewer.mode === 'demo') {
    const data = await getDashboard(viewer)
    payload = {
      note: 'Demo mode: this is seeded sample data, not real account data.',
      account: { email: viewer.email, name: viewer.name, region: viewer.region, plan: viewer.isPro ? viewer.plan : 'free' },
      subscriptions: data.revealed,
    }
  } else {
    const admin = createAdminClient()
    const id = viewer.id
    const [profile, connections, subscriptions, signals, cancellations, alerts] = await Promise.all([
      admin
        .from('profiles')
        .select('email, full_name, region, alert_email, alert_sms, phone, is_pro, plan, subscription_status, current_period_end, created_at')
        .eq('id', id)
        .single(),
      admin.from('app_connections').select('provider, institution_name, account_email, status, last_synced_at, created_at').eq('user_id', id),
      admin
        .from('subscriptions')
        .select(
          'name, cost, currency, billing_cycle, category, next_billing_date, last_charged_at, first_seen_at, status, merchant_key, source, previous_cost, confidence, waste_score, yearly_waste, leak_reasons, created_at',
        )
        .eq('user_id', id),
      admin.from('email_signals').select('kind, merchant_key, sender, subject, amount, currency, occurred_at').eq('user_id', id),
      admin.from('cancellation_logs').select('method, status, recipient, subject, body, region, consented_at, sent_at, confirmed_at, created_at').eq('user_id', id),
      admin.from('alerts').select('kind, title, body, amount_delta, created_at, read_at').eq('user_id', id),
    ])

    const transactions: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      const { data } = await admin
        .from('transactions')
        .select('date, description, merchant_name, amount, iso_currency_code, category, pending, account_id')
        .eq('user_id', id)
        .order('date')
        .range(from, from + PAGE - 1)
      transactions.push(...(data ?? []))
      if (!data || data.length < PAGE) break
    }

    payload = {
      account: profile.data,
      connections: connections.data ?? [],
      transactions,
      email_signals: signals.data ?? [],
      detected_subscriptions: subscriptions.data ?? [],
      cancellation_requests: cancellations.data ?? [],
      alerts: alerts.data ?? [],
    }
  }

  return new NextResponse(JSON.stringify({ exported_at: exportedAt, ...payload }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="subshield-data-${exportedAt.slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
