import 'server-only'
import { decryptToken, encryptToken } from '@/lib/crypto'
import { addDays, isoDate } from '@/lib/dates'
import { detectSubscriptions, pickTeaser } from '@/lib/detection/engine'
import type { Charge, DetectedSubscription, EmailSignal } from '@/lib/detection/types'
import { features } from '@/lib/env'
import { detectedToRow } from '@/lib/data/mappers'
import { sendAlertDigest } from '@/lib/integrations/email'
import { refreshAccessToken, type MailProvider } from '@/lib/integrations/email-oauth'
import { scanMailbox } from '@/lib/integrations/email-scan'
import { plaidErrorCode, syncTransactions } from '@/lib/integrations/plaid'
import { sendSms } from '@/lib/integrations/sms'
import { createAdminClient } from '@/lib/supabase/server'
import type { AlertKind, Tables, TablesInsert } from '@/lib/supabase/database.types'

type Admin = ReturnType<typeof createAdminClient>
type Connection = Tables<'app_connections'>

const BATCH = 500

async function syncPlaid(admin: Admin, conn: Connection) {
  try {
    const result = await syncTransactions(decryptToken(conn.access_token), conn.sync_cursor)
    const rows: TablesInsert<'transactions'>[] = [...result.added, ...result.modified].map((t) => ({
      user_id: conn.user_id,
      connection_id: conn.id,
      external_id: t.transaction_id,
      account_id: t.account_id,
      merchant_name: t.merchant_name ?? null,
      description: t.original_description ?? t.name,
      website: t.website ?? null,
      amount: t.amount,
      iso_currency_code: t.iso_currency_code ?? 'USD',
      date: t.date,
      category: t.personal_finance_category?.detailed ?? null,
      pending: t.pending,
    }))
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await admin.from('transactions').upsert(rows.slice(i, i + BATCH), { onConflict: 'connection_id,external_id' })
      if (error) throw error
    }
    const removed = result.removed.map((r) => r.transaction_id).filter(Boolean) as string[]
    if (removed.length) await admin.from('transactions').delete().eq('connection_id', conn.id).in('external_id', removed)

    await admin
      .from('app_connections')
      .update({ sync_cursor: result.cursor, last_synced_at: new Date().toISOString(), status: 'active', error_code: null })
      .eq('id', conn.id)
    return result.status
  } catch (err) {
    const code = plaidErrorCode(err)
    await admin.from('app_connections').update({ status: 'error', error_code: code ?? 'SYNC_FAILED' }).eq('id', conn.id)
    console.error('[sync] plaid', conn.id, code ?? err)
    return 'ERROR'
  }
}

async function mailAccessToken(admin: Admin, conn: Connection): Promise<string> {
  const fresh = conn.token_expires_at && new Date(conn.token_expires_at).getTime() > Date.now()
  if (fresh) return decryptToken(conn.access_token)
  if (!conn.refresh_token) throw new Error('Mailbox token expired and no refresh token stored')
  const tokens = await refreshAccessToken(conn.provider as MailProvider, decryptToken(conn.refresh_token))
  await admin
    .from('app_connections')
    .update({
      access_token: encryptToken(tokens.accessToken),
      token_expires_at: tokens.expiresAt.toISOString(),
      ...(tokens.refreshToken ? { refresh_token: encryptToken(tokens.refreshToken) } : {}),
    })
    .eq('id', conn.id)
  return tokens.accessToken
}

async function syncMailbox(admin: Admin, conn: Connection) {
  try {
    const signals = await scanMailbox(conn.provider as MailProvider, await mailAccessToken(admin, conn))
    const rows: TablesInsert<'email_signals'>[] = signals.map((s) => ({
      user_id: conn.user_id,
      connection_id: conn.id,
      external_id: s.externalId,
      kind: s.kind,
      merchant_key: s.merchantKey,
      sender: s.sender,
      subject: s.subject,
      amount: s.amount,
      currency: s.currency,
      occurred_at: s.date,
    }))
    for (let i = 0; i < rows.length; i += BATCH) {
      await admin.from('email_signals').upsert(rows.slice(i, i + BATCH), { onConflict: 'connection_id,external_id' })
    }
    await admin.from('app_connections').update({ last_synced_at: new Date().toISOString(), status: 'active', error_code: null }).eq('id', conn.id)
  } catch (err) {
    await admin.from('app_connections').update({ status: 'error', error_code: 'MAIL_SYNC_FAILED' }).eq('id', conn.id)
    console.error('[sync] mailbox', conn.id, err)
  }
}

async function loadLedger(admin: Admin, userId: string, today: string): Promise<{ charges: Charge[]; signals: EmailSignal[] }> {
  const since = addDays(today, -760)
  const charges: Charge[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from('transactions')
      .select('id, connection_id, account_id, merchant_name, description, website, amount, iso_currency_code, date, category')
      .eq('user_id', userId)
      .eq('pending', false)
      .gt('amount', 0)
      .gte('date', since)
      .order('date')
      .range(from, from + 999)
    if (error) throw error
    for (const t of data ?? []) {
      charges.push({
        id: t.id,
        source: 'bank',
        description: t.description,
        merchantName: t.merchant_name,
        website: t.website,
        amount: Number(t.amount),
        currency: t.iso_currency_code,
        date: t.date,
        accountId: t.account_id,
        connectionId: t.connection_id,
        category: t.category,
      })
    }
    if (!data || data.length < 1000) break
  }

  const { data: mail } = await admin.from('email_signals').select('*').eq('user_id', userId).gte('occurred_at', since)
  const signals: EmailSignal[] = []
  for (const s of mail ?? []) {
    signals.push({ merchantKey: s.merchant_key, kind: s.kind, amount: s.amount === null ? null : Number(s.amount), date: s.occurred_at })
    if (s.kind === 'receipt' && s.amount) {
      charges.push({ id: s.id, source: 'email', description: s.subject ?? s.merchant_key, merchantKey: s.merchant_key, amount: Number(s.amount), currency: s.currency ?? 'USD', date: s.occurred_at, connectionId: null })
    }
  }
  return { charges, signals }
}

interface NewAlert {
  kind: AlertKind
  title: string
  body: string
  amount: number | null
  dedupe: string
  merchantKey: string
}

function diffAlerts(detected: DetectedSubscription[], existing: Map<string, Tables<'subscriptions'>>): NewAlert[] {
  const out: NewAlert[] = []
  for (const d of detected) {
    const prev = existing.get(d.merchantKey)
    if (!prev) {
      out.push({ kind: 'new_subscription', title: `New subscription: ${d.name}`, body: `$${d.cost.toFixed(2)}/${d.cycle} — first charged ${d.firstSeenAt}`, amount: d.cost, dedupe: `new:${d.merchantKey}`, merchantKey: d.merchantKey })
    }
    for (const r of d.leakReasons) {
      if (r.kind === 'price_hike' && prev && Number(prev.cost) !== d.cost)
        out.push({ kind: 'price_hike', title: `${d.name} raised its price`, body: r.detail, amount: r.yearlyImpact, dedupe: `hike:${d.merchantKey}:${d.cost}`, merchantKey: d.merchantKey })
      if (r.kind === 'charged_after_cancel')
        out.push({ kind: 'charged_after_cancel', title: `${d.name} charged you after cancelling`, body: r.detail, amount: d.cost, dedupe: `zombie:${d.merchantKey}:${d.lastChargedAt}`, merchantKey: d.merchantKey })
      if (r.kind === 'duplicate_charge')
        out.push({ kind: 'duplicate', title: `${d.name} is billing you twice`, body: r.detail, amount: r.yearlyImpact, dedupe: `dup:${d.merchantKey}`, merchantKey: d.merchantKey })
    }
  }
  return out
}

/**
 * Pull fresh data for every connection, re-run the leak engine and persist the
 * result. Safe to call repeatedly (webhooks, manual refresh, first connect).
 */
export async function syncUser(userId: string, opts: { connectionId?: string } = {}) {
  const admin = createAdminClient()
  const today = isoDate(new Date())

  const { data: connections } = await admin.from('app_connections').select('*').eq('user_id', userId).neq('status', 'disconnected')
  const targets = (connections ?? []).filter((c) => !opts.connectionId || c.id === opts.connectionId)
  let plaidStatus = 'NONE'
  for (const conn of targets) {
    if (conn.provider === 'plaid') plaidStatus = await syncPlaid(admin, conn)
    else await syncMailbox(admin, conn)
  }

  const { charges, signals } = await loadLedger(admin, userId, today)
  const detected = detectSubscriptions({ charges, signals, today })

  const { data: existingRows } = await admin.from('subscriptions').select('*').eq('user_id', userId)
  const existing = new Map((existingRows ?? []).map((r) => [r.merchant_key, r]))
  const firstRun = existing.size === 0

  // Upsert detections. `status` is omitted so user choices (ignored, cancelling) survive re-syncs.
  if (detected.length) {
    const { error } = await admin.from('subscriptions').upsert(
      detected.map((d) => detectedToRow(d, userId)),
      { onConflict: 'user_id,merchant_key' },
    )
    if (error) throw error
  }

  // Anything that stopped billing is effectively cancelled.
  const seen = new Set(detected.map((d) => d.merchantKey))
  const stopped = (existingRows ?? []).filter((r) => !seen.has(r.merchant_key) && (r.status === 'active' || r.status === 'cancelling'))
  if (stopped.length) await admin.from('subscriptions').update({ status: 'cancelled', is_teaser: false }).in('id', stopped.map((r) => r.id))

  // Exactly one free teaser: the biggest active leak.
  await admin.from('subscriptions').update({ is_teaser: false }).eq('user_id', userId).eq('is_teaser', true)
  const activeDetected = detected.filter((d) => (existing.get(d.merchantKey)?.status ?? 'active') === 'active')
  const teaser = pickTeaser(activeDetected)
  if (teaser) await admin.from('subscriptions').update({ is_teaser: true }).eq('user_id', userId).eq('merchant_key', teaser.merchantKey)

  // Monitoring alerts — skipped on the very first scan so it isn't a flood.
  if (!firstRun) await raiseAlerts(admin, userId, diffAlerts(detected, existing))

  return { subscriptions: detected.length, plaidStatus }
}

async function raiseAlerts(admin: Admin, userId: string, alerts: NewAlert[]) {
  if (!alerts.length) return
  const { data: subs } = await admin.from('subscriptions').select('id, merchant_key').eq('user_id', userId)
  const idFor = new Map((subs ?? []).map((s) => [s.merchant_key, s.id]))
  const { data: inserted } = await admin
    .from('alerts')
    .upsert(
      alerts.map((a) => ({ user_id: userId, subscription_id: idFor.get(a.merchantKey) ?? null, kind: a.kind, title: a.title, body: a.body, amount_delta: a.amount, dedupe_key: a.dedupe })),
      { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true },
    )
    .select()
  if (!inserted?.length) return

  const { data: profile } = await admin.from('profiles').select('email, is_pro, alert_email, alert_sms, phone').eq('id', userId).single()
  if (!profile?.is_pro) return

  if (profile.alert_email && features.resend) {
    await sendAlertDigest({
      to: profile.email,
      subject: inserted.length === 1 ? inserted[0].title : `${inserted.length} new subscription alerts`,
      heading: 'Something changed in your subscriptions',
      intro: 'SubShield spotted these in your latest bank sync.',
      items: inserted.map((a) => ({ title: a.title, detail: a.body ?? '', tone: a.kind === 'new_subscription' ? 'insight' : 'leak' })),
    }).catch((err) => console.error('[alerts] email', err))
    await admin.from('alerts').update({ delivered_email_at: new Date().toISOString() }).in('id', inserted.map((a) => a.id))
  }
  if (profile.alert_sms && profile.phone && features.twilio) {
    const sent = await sendSms(profile.phone, `SubShield: ${inserted.map((a) => a.title).slice(0, 3).join(' · ')}`)
    if (sent) await admin.from('alerts').update({ delivered_sms_at: new Date().toISOString() }).in('id', inserted.map((a) => a.id))
  }
}
