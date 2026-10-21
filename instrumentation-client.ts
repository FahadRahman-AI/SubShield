import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'
import { track } from '@/lib/analytics'
import { SENTRY_DSN, sentryOptions } from '@/lib/observability/sentry'

// Runs once in the browser before the app becomes interactive. Each tool is
// isolated so a failure in one can't take down the other (or the app).

try {
  if (SENTRY_DSN) Sentry.init(sentryOptions)
} catch (err) {
  console.warn('[sentry] init failed', err)
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

try {
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: '/ingest', // proxied in next.config.ts
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? 'https://us.posthog.com',
      // No cookies or local storage at all, so no consent banner is needed.
      // Requires "Cookieless server hash mode" in the PostHog project settings.
      cookieless_mode: 'always',
      person_profiles: 'never',
      // Explicit funnel events only: never record clicks, inputs or sessions
      // on screens that show people's bank data.
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: 'history_change',
      capture_pageleave: false,
    })

    // Marketing CTAs (including in Server Components) opt in with data-track="location".
    document.addEventListener('click', (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-track]')
      if (el?.dataset.track) track('cta_clicked', { location: el.dataset.track })
    })
  }
} catch (err) {
  console.warn('[posthog] init failed', err)
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
