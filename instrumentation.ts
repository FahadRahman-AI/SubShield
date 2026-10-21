import * as Sentry from '@sentry/nextjs'

// Server-side error monitoring. A no-op until NEXT_PUBLIC_SENTRY_DSN is set,
// so local and demo runs never report anything.
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}

// Reports errors thrown while rendering Server Components, Route Handlers and
// Server Actions (does nothing if Sentry was never initialised).
export const onRequestError = Sentry.captureRequestError
