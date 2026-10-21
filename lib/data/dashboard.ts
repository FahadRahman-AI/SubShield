import 'server-only'
import { connection } from 'next/server'
import { buildDemoLedger } from '@/lib/demo/ledger'
import { readDemoState, type DemoState } from '@/lib/demo/state'
import { detectSubscriptions, pickTeaser } from '@/lib/detection/engine'
import { resolveMerchant } from '@/lib/detection/normalize'
import { addDays, isoDate } from '@/lib/dates'
import { createAdminClient } from '@/lib/supabase/server'
import { detectedToView, rowToView } from './mappers'
import { projectDashboard } from './project'
import type { AlertView, ConnectionView, DashboardData, SubscriptionView, Viewer } from './types'

// ─── Demo mode ───────────────────────────────────────────────────────────────

let demoCache: { day: string; subs: SubscriptionView[] } | null = null

function demoSubscriptions(today: string, state: DemoState): SubscriptionView[] {
  if (demoCache?.day !== today) {
    const ledger = buildDemoLedger(today)
    const detected = detectSubscriptions({ charges: ledger.charges, signals: ledger.signals, today })
    const teaser = pickTeaser(detected)
    demoCache = { day: today, subs: detected.map((d) => detectedToView(d, 'active', d === teaser)) }
  }
  return demoCache.subs.map((s) => ({ ...s, status: state.statuses[s.id] ?? s.status }))
}

function demoAlerts(subs: SubscriptionView[], today: string): AlertView[] {
  const alerts: AlertView[] = []
  for (const s of subs) {
    for (const r of s.leakReasons) {
      if (r.kind === 'price_hike') alerts.push({ id: `a-${s.id}-hike`, kind: 'price_hike', title: `${s.name}: ${r.label.toLowerCase()}`, body: r.detail, createdAt: s.history.at(-1)?.date ?? today, read: false })
      if (r.kind === 'trial_conversion') alerts.push({ id: `a-${s.id}-new`, kind: 'new_subscription', title: `New subscription: ${s.name}`, body: r.detail, createdAt: s.history[0]?.date ?? today, read: false })
      if (r.kind === 'charged_after_cancel') alerts.push({ id: `a-${s.id}-zombie`, kind: 'charged_after_cancel', title: `${s.name} charged you after cancelling`, body: r.detail, createdAt: s.lastChargedAt ?? today, read: false })
    }
  }
  const soon = subs.filter((s) => s.nextBillingDate <= addDays(today, 3) && s.status === 'active')
  for (const s of soon) alerts.push({ id: `a-${s.id}-renew`, kind: 'renewal', title: `${s.name} renews ${s.nextBillingDate === today ? 'today' : 'soon'}`, body: `$${s.cost.toFixed(2)} on ${s.nextBillingDate}`, createdAt: addDays(today, -1), read: false })
  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8)
}

// ─── Live mode ───────────────────────────────────────────────────────────────

async function liveSubscriptions(userId: string): Promise<SubscriptionView[]> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('subscriptions').select('*').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).filter((r) => r.status !== 'ignored').map((r) => rowToView(r))
}

async function liveConnections(userId: string): Promise<ConnectionView[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('app_connections')
    .select('id, provider, institution_name, account_email, status, last_synced_at')
    .eq('user_id', userId)
    .neq('status', 'disconnected')
    .order('created_at')
  return (data ?? []).map((c) => ({
    id: c.id,
    provider: c.provider,
    label: c.provider === 'plaid' ? (c.institution_name ?? 'Bank account') : c.provider === 'google' ? 'Gmail' : 'Outlook',
    detail: c.provider === 'plaid' ? 'Transactions · read-only' : c.account_email,
    status: c.status ?? 'active',
    lastSyncedAt: c.last_synced_at,
  }))
}

async function liveAlerts(userId: string): Promise<AlertView[]> {
  const admin = createAdminClient()
  const { data } = await admin.from('alerts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(8)
  return (data ?? []).map((a) => ({ id: a.id, kind: a.kind, title: a.title, body: a.body, createdAt: a.created_at, read: Boolean(a.read_at) }))
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getDashboard(viewer: Viewer): Promise<DashboardData> {
  await connection() // "today" is request-time data
  const today = isoDate(new Date())

  if (viewer.mode === 'demo') {
    const state = await readDemoState()
    const connections: ConnectionView[] = state.connected
      ? [
          { id: 'demo-plaid', provider: 'plaid', label: 'Chase', detail: 'Total Checking ••4417 · Sapphire ••9032', status: 'active', lastSyncedAt: new Date().toISOString() },
          { id: 'demo-plaid-2', provider: 'plaid', label: 'American Express', detail: 'Gold Card ••1008', status: 'active', lastSyncedAt: new Date().toISOString() },
          ...(state.emailConnected ? [{ id: 'demo-google', provider: 'google' as const, label: 'Gmail', detail: 'alex@example.com', status: 'active' as const, lastSyncedAt: new Date().toISOString() }] : []),
        ]
      : []
    const subs = state.connected ? demoSubscriptions(today, state) : []
    return {
      viewer,
      connections,
      hasData: state.connected,
      lastSyncedAt: state.connected ? new Date().toISOString() : null,
      ...projectDashboard(subs, viewer.isPro, today),
      alerts: viewer.isPro ? demoAlerts(subs, today) : [],
    }
  }

  const [subs, connections, alerts] = await Promise.all([
    liveSubscriptions(viewer.id),
    liveConnections(viewer.id),
    viewer.isPro ? liveAlerts(viewer.id) : Promise.resolve([]),
  ])
  const lastSyncedAt = connections.map((c) => c.lastSyncedAt).filter(Boolean).sort().at(-1) ?? null
  return {
    viewer,
    connections,
    hasData: connections.length > 0,
    lastSyncedAt,
    ...projectDashboard(subs, viewer.isPro, today),
    alerts,
  }
}

/**
 * A single subscription, only if the viewer may see it: Pro users see all of
 * theirs, free users only their teaser. Returns null otherwise.
 */
export async function getSubscriptionForViewer(viewer: Viewer, id: string): Promise<SubscriptionView | null> {
  await connection()
  const today = isoDate(new Date())
  if (viewer.mode === 'demo') {
    const state = await readDemoState()
    if (!state.connected) return null
    const sub = demoSubscriptions(today, state).find((s) => s.id === id)
    return sub && (viewer.isPro || sub.isTeaser) ? sub : null
  }
  const admin = createAdminClient()
  const { data } = await admin.from('subscriptions').select('*').eq('user_id', viewer.id).eq('id', id).maybeSingle()
  if (!data || !(viewer.isPro || data.is_teaser)) return null

  const { data: tx } = await admin
    .from('transactions')
    .select('date, amount, merchant_name, description')
    .eq('user_id', viewer.id)
    .gt('amount', 0)
    .order('date', { ascending: true })
    .limit(2000)
  const cost = Number(data.cost)
  const history = (tx ?? [])
    .filter((t) => {
      const key = resolveMerchant({ description: t.description, merchantName: t.merchant_name, amount: Number(t.amount) })?.key
      if (key === data.merchant_key) return true
      // Multi-plan merchants are stored as "<key>-<rounded cost>".
      return Boolean(key && data.merchant_key.startsWith(`${key}-`) && Math.abs(Number(t.amount) - cost) / cost <= 0.25)
    })
    .map((t) => ({ date: t.date, amount: Number(t.amount) }))
  return rowToView(data, history)
}

export async function getCancellationHistory(viewer: Viewer) {
  if (viewer.mode === 'demo') {
    const state = await readDemoState()
    return Object.entries(state.sent).map(([id, sentAt]) => ({ subscriptionId: id, status: 'sent' as const, sentAt, method: 'email' as const }))
  }
  const admin = createAdminClient()
  const { data } = await admin
    .from('cancellation_logs')
    .select('subscription_id, status, sent_at, method')
    .eq('user_id', viewer.id)
    .order('created_at', { ascending: false })
  return (data ?? []).map((l) => ({ subscriptionId: l.subscription_id, status: l.status ?? 'draft', sentAt: l.sent_at, method: l.method ?? 'email' }))
}
