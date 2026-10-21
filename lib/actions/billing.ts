'use server'

import { refresh } from 'next/cache'
import { requireViewer } from '@/lib/auth'
import { writeDemoState } from '@/lib/demo/state'
import { env, features } from '@/lib/env'
import { priceIdFor, stripe } from '@/lib/integrations/stripe'
import { createAdminClient } from '@/lib/supabase/server'

type Result = { ok: true; url?: string } | { ok: false; error: string }

export async function startCheckout(plan: 'monthly' | 'yearly'): Promise<Result> {
  const viewer = await requireViewer()
  if (plan !== 'monthly' && plan !== 'yearly') return { ok: false, error: 'Unknown plan.' }

  if (viewer.mode === 'demo') {
    // Demo mode simulates a successful checkout.
    await writeDemoState({ pro: true, plan })
    refresh()
    return { ok: true }
  }
  if (viewer.isPro) return { ok: false, error: 'You’re already on Pro.' }
  if (!features.stripe) return { ok: false, error: 'Billing isn’t configured yet (missing Stripe keys).' }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', viewer.id).single()
  let customer = profile?.stripe_customer_id ?? null
  if (!customer) {
    const created = await stripe().customers.create({ email: viewer.email, name: viewer.name ?? undefined, metadata: { user_id: viewer.id } })
    customer = created.id
    await admin.from('profiles').update({ stripe_customer_id: customer }).eq('id', viewer.id)
  }

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: viewer.id,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: { metadata: { user_id: viewer.id } },
    success_url: `${env.appUrl}/dashboard?upgraded=1`,
    cancel_url: `${env.appUrl}/dashboard?checkout=cancelled`,
  })
  return session.url ? { ok: true, url: session.url } : { ok: false, error: 'Stripe did not return a checkout URL.' }
}

export async function openBillingPortal(): Promise<Result> {
  const viewer = await requireViewer()
  if (viewer.mode === 'demo') {
    await writeDemoState({ pro: false, plan: null })
    refresh()
    return { ok: true }
  }
  if (!features.stripe) return { ok: false, error: 'Billing isn’t configured yet.' }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', viewer.id).single()
  if (!profile?.stripe_customer_id) return { ok: false, error: 'No billing account yet.' }
  const portal = await stripe().billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: `${env.appUrl}/dashboard/settings` })
  return { ok: true, url: portal.url }
}
