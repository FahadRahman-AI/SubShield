import type { ErrorEvent } from '@sentry/nextjs'

// Shared Sentry options for the browser, Node and Edge runtimes.
//
// SubShield handles bank and inbox data, so reports are deliberately thin:
// no default PII (IPs, cookies, user headers), no request bodies or query
// strings, and no session replay. Stack traces and route names are enough to
// debug; transaction data never needs to leave the server.

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.query_string
    if (event.request.headers) {
      for (const h of ['authorization', 'cookie', 'plaid-verification', 'stripe-signature']) delete event.request.headers[h]
    }
  }
  return event
}

export const sentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  // Errors are always captured; performance tracing is sampled.
  tracesSampleRate: 0.1,
  beforeSend: scrubEvent,
}
