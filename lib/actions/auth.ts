'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { clearDemoState } from '@/lib/demo/state'
import { env, isDemo } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

const safeNext = (next: unknown) => (typeof next === 'string' && next.startsWith('/dashboard') ? next : '/dashboard')

export async function signInWithEmail(_: unknown, formData: FormData): Promise<{ ok: boolean; message: string }> {
  if (isDemo) redirect('/dashboard')
  const parsed = z.email().safeParse(formData.get('email'))
  if (!parsed.success) return { ok: false, message: 'Enter a valid email address.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(safeNext(formData.get('next')))}` },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true, message: `Check ${parsed.data} for your sign-in link.` }
}

export async function signInWithGoogle(formData: FormData) {
  if (isDemo) redirect('/dashboard')
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(safeNext(formData.get('next')))}` },
  })
  if (error || !data.url) redirect('/login?error=oauth')
  redirect(data.url)
}

export async function signOut() {
  if (isDemo) {
    await clearDemoState()
    redirect('/')
  }
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
