import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { env, requireEnv } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Request-scoped client that acts as the signed-in user. RLS applies.
 * Create a new one per request — never share it across requests.
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    requireEnv(env.supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(env.supabasePublishableKey, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The proxy refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  )
}

/**
 * Service-role client. Bypasses RLS — only use from server code after the
 * caller has been authenticated and authorized.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    requireEnv(env.supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(env.supabaseSecretKey, 'SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
