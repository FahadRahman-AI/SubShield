import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { readDemoState } from '@/lib/demo/state'
import { isDemo } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import type { Viewer } from '@/lib/data/types'

export const DEMO_USER_ID = 'demo-user'

/**
 * The Data Access Layer entry point: who is making this request?
 * Verifies the Supabase JWT (getClaims checks the signature) and loads the
 * profile through RLS. Deduplicated per request.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (isDemo) {
    const demo = await readDemoState()
    return {
      mode: 'demo',
      id: DEMO_USER_ID,
      email: 'alex@example.com',
      name: 'Alex Morgan',
      isPro: demo.pro,
      plan: demo.plan,
      currentPeriodEnd: null,
      region: demo.region,
      alertEmail: demo.alertEmail,
      alertSms: demo.alertSms,
      phone: demo.phone,
      hasBilling: demo.pro,
    }
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  const email = profile?.email ?? (typeof data.claims.email === 'string' ? data.claims.email : '')
  return {
    mode: 'live',
    id: userId,
    email,
    name: profile?.full_name ?? null,
    isPro: profile?.is_pro ?? false,
    plan: profile?.plan ?? null,
    currentPeriodEnd: profile?.current_period_end ?? null,
    region: profile?.region ?? 'US',
    alertEmail: profile?.alert_email ?? true,
    alertSms: profile?.alert_sms ?? false,
    phone: profile?.phone ?? null,
    hasBilling: Boolean(profile?.stripe_customer_id),
  }
})

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect('/login')
  return viewer
}

export async function requirePro(): Promise<Viewer> {
  const viewer = await requireViewer()
  if (!viewer.isPro) throw new PaywallError()
  return viewer
}

export class PaywallError extends Error {
  constructor() {
    super('This action requires SubShield Pro.')
    this.name = 'PaywallError'
  }
}
