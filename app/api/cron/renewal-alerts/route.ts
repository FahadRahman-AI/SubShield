import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { sendProRenewalReminders } from '@/lib/billing/renewal-reminders'
import { addDays, formatShortDate, isoDate } from '@/lib/dates'
import { env, features } from '@/lib/env'
import { sendAlertDigest } from '@/lib/integrations/email'
import { sendSms } from '@/lib/integrations/sms'
import { createAdminClient } from '@/lib/supabase/server'

// Daily cron (vercel.json): warn Pro users 3 days before each renewal.
// Vercel sends `Authorization: Bearer $CRON_SECRET`.

function authorized(request: NextRequest) {
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${env.cronSecret ?? ''}`)
  return Boolean(env.cronSecret) && given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!features.supabase) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  const admin = createAdminClient()
  const target = addDays(isoDate(new Date()), 3)
  const { data: due, error } = await admin
    .from('subscriptions')
    .select('id, user_id, name, cost, billing_cycle, next_billing_date, profiles!inner(email, is_pro, alert_email, alert_sms, phone)')
    .eq('status', 'active')
    .eq('next_billing_date', target)
    .eq('profiles.is_pro', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = NonNullable<typeof due>[number]
  const byUser = new Map<string, Row[]>()
  for (const row of due ?? []) byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row])

  let emails = 0
  let texts = 0
  for (const [userId, rows] of byUser) {
    const { data: fresh } = await admin
      .from('alerts')
      .upsert(
        rows.map((r) => ({
          user_id: userId,
          subscription_id: r.id,
          kind: 'renewal' as const,
          title: `${r.name} renews ${formatShortDate(r.next_billing_date)}`,
          body: `$${Number(r.cost).toFixed(2)} will be charged in 3 days.`,
          amount_delta: Number(r.cost),
          dedupe_key: `renewal:${r.id}:${r.next_billing_date}`,
        })),
        { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true },
      )
      .select('id')
    if (!fresh?.length) continue // already warned

    const profile = (Array.isArray(rows[0].profiles) ? rows[0].profiles[0] : rows[0].profiles) as {
      email: string
      alert_email: boolean
      alert_sms: boolean
      phone: string | null
    }
    const total = rows.reduce((t, r) => t + Number(r.cost), 0)

    if (profile.alert_email && features.resend) {
      await sendAlertDigest({
        to: profile.email,
        subject: `$${total.toFixed(2)} in renewals on ${formatShortDate(target)}`,
        heading: 'Renewing in 3 days',
        intro: 'Cancel now if you don’t want these charges.',
        items: rows.map((r) => ({ title: r.name, detail: `Renews ${formatShortDate(r.next_billing_date)} · ${r.billing_cycle}`, amount: `$${Number(r.cost).toFixed(2)}`, tone: 'warn' as const })),
        path: '/dashboard/cancel',
      })
        .then(() => emails++)
        .catch((err) => console.error('[cron] email', userId, err))
    }
    if (profile.alert_sms && profile.phone && features.twilio) {
      const ok = await sendSms(profile.phone, `SubShield: ${rows.map((r) => r.name).join(', ')} renew${rows.length === 1 ? 's' : ''} in 3 days ($${total.toFixed(2)}).`)
      if (ok) texts++
    }
  }
  // SubShield's own yearly plans get a renewal reminder too (a legal notice, not an alert).
  const pro = await sendProRenewalReminders().catch((err) => {
    console.error('[cron] pro renewal reminders', err)
    return { sent: 0 }
  })

  return NextResponse.json({ ok: true, users: byUser.size, emails, texts, proRenewalReminders: pro.sent })
}
