'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * Attaches the signed-in user's opaque id (never their email) to error
 * reports so a bug can be traced to an account. Pass null for demo visitors,
 * who all share one id.
 */
export function SentryUser({ id }: { id: string | null }) {
  useEffect(() => {
    Sentry.setUser(id ? { id } : null)
  }, [id])
  return null
}
