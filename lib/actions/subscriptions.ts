'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { requireViewer } from '@/lib/auth'
import { getSubscriptionForViewer } from '@/lib/data/dashboard'
import { readDemoState, writeDemoState } from '@/lib/demo/state'
import { features } from '@/lib/env'
import { sendCancellationRequest } from '@/lib/integrations/email'
import { createAdminClient } from '@/lib/supabase/server'

type Result = { ok: true; message?: string } | { ok: false; error: string; paywall?: boolean }

const StatusInput = z.object({ id: z.string().min(1).max(100), status: z.enum(['active', 'cancelling', 'cancelled', 'ignored']) })

export async function setSubscriptionStatus(input: z.infer<typeof StatusInput>): Promise<Result> {
  const viewer = await requireViewer()
  const parsed = StatusInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }
  const sub = await getSubscriptionForViewer(viewer, parsed.data.id)
  if (!sub) return { ok: false, error: 'Upgrade to manage this subscription.', paywall: true }

  if (viewer.mode === 'demo') {
    const state = await readDemoState()
    await writeDemoState({ statuses: { ...state.statuses, [sub.id]: parsed.data.status } })
  } else {
    const admin = createAdminClient()
    const { error } = await admin.from('subscriptions').update({ status: parsed.data.status }).eq('id', sub.id).eq('user_id', viewer.id)
    if (error) return { ok: false, error: 'Couldn’t update that subscription.' }
  }
  refresh()
  return { ok: true }
}

const SendInput = z.object({
  id: z.string().min(1).max(100),
  method: z.enum(['email', 'letter']),
  recipient: z.email().max(254).optional(),
  subject: z.string().min(5).max(200),
  body: z.string().min(40).max(6000),
  region: z.enum(['US', 'UK', 'EU', 'CA', 'AU']),
  /** The user ticked "I authorise SubShield to send this on my behalf". Required to email a vendor. */
  consent: z.boolean(),
})

const DAILY_SEND_LIMIT = 10

/**
 * Pro only. Emails the cancellation request to the vendor from SubShield's
 * cancellation address, CCs the user, and routes replies to them. For
 * "letter" it just records that the user is mailing it themselves.
 */
export async function sendCancellation(input: z.infer<typeof SendInput>): Promise<Result> {
  const viewer = await requireViewer()
  if (!viewer.isPro) return { ok: false, error: 'Sending cancellations is a Pro feature.', paywall: true }
  const parsed = SendInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  const { id, method, recipient, subject, body, region, consent } = parsed.data
  if (method === 'email' && !recipient) return { ok: false, error: 'Add the vendor’s support email address.' }
  // We only ever send on the user's explicit, per-letter authority.
  if (method === 'email' && !consent) return { ok: false, error: 'Tick the box to authorise us to send this request for you.' }

  const sub = await getSubscriptionForViewer(viewer, id)
  if (!sub) return { ok: false, error: 'Subscription not found.' }

  if (viewer.mode === 'demo') {
    const state = await readDemoState()
    await writeDemoState({ statuses: { ...state.statuses, [sub.id]: 'cancelling' }, sent: { ...state.sent, [sub.id]: new Date().toISOString() } })
    refresh()
    return { ok: true, message: method === 'email' ? `Demo mode: request to ${recipient} recorded (no email sent).` : 'Marked as mailed.' }
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await admin.from('cancellation_logs').select('id', { count: 'exact', head: true }).eq('user_id', viewer.id).eq('status', 'sent').gte('sent_at', since)
  if ((count ?? 0) >= DAILY_SEND_LIMIT) return { ok: false, error: 'Daily sending limit reached. Try again tomorrow.' }

  let providerId: string | null = null
  if (method === 'email') {
    if (!features.resend) return { ok: false, error: 'Email sending isn’t configured yet (missing RESEND_API_KEY).' }
    try {
      providerId = await sendCancellationRequest({
        to: recipient!,
        userEmail: viewer.email,
        userName: viewer.name ?? viewer.email,
        subject,
        body,
        idempotencyKey: `cancel-${sub.id}-${new Date().toISOString().slice(0, 10)}`,
      })
    } catch (err) {
      console.error('[cancel] send', err)
      return { ok: false, error: 'The email couldn’t be sent. Check the address and try again.' }
    }
  }

  await admin.from('cancellation_logs').insert({
    user_id: viewer.id,
    subscription_id: sub.id,
    method,
    consented_at: method === 'email' ? new Date().toISOString() : null,
    status: 'sent',
    recipient: recipient ?? null,
    subject,
    body,
    region,
    provider_message_id: providerId,
    sent_at: new Date().toISOString(),
  })
  await admin.from('subscriptions').update({ status: 'cancelling' }).eq('id', sub.id).eq('user_id', viewer.id)
  refresh()
  return { ok: true, message: method === 'email' ? `Sent to ${recipient}. You’re in CC.` : 'Logged. Keep your certified-mail receipt.' }
}
