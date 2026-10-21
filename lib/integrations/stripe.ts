import 'server-only'
import Stripe from 'stripe'
import { env, requireEnv } from '@/lib/env'

let client: Stripe | null = null

export function stripe(): Stripe {
  if (!client) client = new Stripe(requireEnv(env.stripeSecretKey, 'STRIPE_SECRET_KEY'), { appInfo: { name: 'SubShield' } })
  return client
}

export function priceIdFor(plan: 'monthly' | 'yearly'): string {
  return plan === 'monthly'
    ? requireEnv(env.stripePriceMonthly, 'STRIPE_PRICE_MONTHLY')
    : requireEnv(env.stripePriceYearly, 'STRIPE_PRICE_YEARLY')
}

export function planForPrice(priceId: string | undefined): 'monthly' | 'yearly' | null {
  if (priceId && priceId === env.stripePriceMonthly) return 'monthly'
  if (priceId && priceId === env.stripePriceYearly) return 'yearly'
  return null
}

/** Statuses that keep Pro unlocked. past_due keeps access during Stripe's retry window. */
export const PRO_STATUSES = new Set<Stripe.Subscription.Status>(['active', 'trialing', 'past_due'])
