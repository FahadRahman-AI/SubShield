import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { env, features } from '@/lib/env'
import { planForPrice, PRO_STATUSES, stripe } from '@/lib/integrations/stripe'
import { createAdminClient } from '@/lib/supabase/server'

// The only writer of is_pro. Signature-verified and idempotent (stripe_events).
export async function POST(request: NextRequest) {
  if (!features.stripe || !env.stripeWebhookSecret || !features.supabase) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }

  const raw = await request.text()
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(raw, request.headers.get('stripe-signature') ?? '', env.stripeWebhookSecret)
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error: dupe } = await admin.from('stripe_events').insert({ id: event.id, type: event.type })
  if (dupe) return NextResponse.json({ ok: true, duplicate: true }) // already processed

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode === 'subscription' && typeof session.subscription === 'string') {
          await applySubscription(admin, await stripe().subscriptions.retrieve(session.subscription), session.client_reference_id)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await applySubscription(admin, event.data.object, null)
        break
    }
  } catch (err) {
    // Let Stripe retry: forget the event so the retry isn't treated as a duplicate.
    await admin.from('stripe_events').delete().eq('id', event.id)
    console.error('[stripe webhook]', event.type, err)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

async function applySubscription(admin: ReturnType<typeof createAdminClient>, sub: Stripe.Subscription, userIdHint: string | null) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const userId = userIdHint ?? sub.metadata?.user_id ?? null
  const item = sub.items.data[0]
  const update = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    is_pro: PRO_STATUSES.has(sub.status),
    subscription_status: sub.status,
    plan: planForPrice(item?.price.id),
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
  }
  const query = admin.from('profiles').update(update)
  const { error } = userId ? await query.eq('id', userId) : await query.eq('stripe_customer_id', customerId)
  if (error) throw error
}
