import 'server-only'
import { features } from '@/lib/env'
import { sendAlertDigest } from '@/lib/integrations/email'
import { RENEWAL_REMINDER_DAYS } from '@/lib/legal'
import { PRICING } from '@/lib/pricing'
import { createAdminClient } from '@/lib/supabase/server'

const DAY = 86_400_000

/**
 * Reminds yearly Pro customers RENEWAL_REMINDER_DAYS before their plan renews.
 * A legal notice, not marketing, so it ignores alert preferences. Runs daily;
 * the window is a few days wide so a missed cron run still sends, and
 * renewal_reminder_for makes sure each renewal gets exactly one email.
 */
export async function sendProRenewalReminders(now = new Date()): Promise<{ sent: number }> {
  if (!features.resend) return { sent: 0 }
  const admin = createAdminClient()
  const from = new Date(now.getTime() + (RENEWAL_REMINDER_DAYS - 3) * DAY).toISOString()
  const to = new Date(now.getTime() + RENEWAL_REMINDER_DAYS * DAY).toISOString()

  const { data: due, error } = await admin
    .from('profiles')
    .select('id, email, current_period_end, renewal_reminder_for')
    .eq('is_pro', true)
    .eq('plan', 'yearly')
    .in('subscription_status', ['active', 'trialing'])
    .gte('current_period_end', from)
    .lte('current_period_end', to)
  if (error) throw error

  let sent = 0
  for (const p of due ?? []) {
    if (!p.current_period_end || p.renewal_reminder_for === p.current_period_end) continue
    const renews = new Date(p.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    try {
      await sendAlertDigest({
        to: p.email,
        subject: `Your SubShield Pro plan renews on ${renews}`,
        heading: `Your plan renews on ${renews}`,
        intro: `Your yearly SubShield Pro subscription renews automatically on ${renews}. If you’d like to keep it, you don’t need to do anything.`,
        items: [
          {
            title: 'SubShield Pro — yearly',
            detail: 'To cancel, open Plan & alerts → Manage billing before the renewal date. Pro stays active until then and you won’t be charged again.',
            amount: `$${PRICING.yearly.amount.toFixed(2)}`,
            tone: 'warn',
          },
        ],
        path: '/dashboard/settings',
      })
      await admin.from('profiles').update({ renewal_reminder_for: p.current_period_end }).eq('id', p.id)
      sent++
    } catch (err) {
      console.error('[renewal reminder]', p.id, err)
    }
  }
  return { sent }
}
