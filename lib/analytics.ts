import posthog from 'posthog-js'

// Product analytics. Every call is a no-op until PostHog has been initialised
// (instrumentation-client.ts, only when NEXT_PUBLIC_POSTHOG_KEY is set).
//
// Events carry no amounts, names, emails or account data — just the step of
// the funnel and a few coarse labels.

export type AnalyticsEvent =
  | 'cta_clicked' // { location } — any element with data-track="…"
  | 'scan_started' // { demo }
  | 'scan_completed'
  | 'paywall_opened'
  | 'checkout_started' // { plan }
  | 'pro_unlocked' // { via: 'stripe' | 'demo' }
  | 'cancellation_sent' // { method, merchant }

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}
