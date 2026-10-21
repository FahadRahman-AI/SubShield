'use client'

import { Loader2, MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/form'
import { signInWithEmail, signInWithGoogle } from '@/lib/actions/auth'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12Z" />
    </svg>
  )
}

export function LoginForm({ demo }: { demo: boolean }) {
  const params = useSearchParams()
  const next = params.get('next') ?? '/dashboard'
  const error = params.get('error')
  const [state, action, pending] = useActionState(signInWithEmail, null)

  if (demo) {
    return (
      <div className="mt-10">
        <p className="bg-lavender p-4 text-[14px] leading-relaxed">
          Supabase isn’t configured, so SubShield is running in <strong>demo mode</strong>: the real detection engine on a seeded 14-month bank ledger. Add your
          keys to <code className="bg-white/60 px-1.5 py-0.5 font-mono text-[12px]">.env.local</code> to go live.
        </p>
        <Button asChild size="lg" className="mt-px w-full">
          <Link href="/dashboard">Enter the demo</Link>
        </Button>
      </div>
    )
  }

  if (state?.ok) {
    return (
      <div className="mt-10 bg-lime p-6">
        <MailCheck className="size-6" />
        <p className="type-title mt-4">{state.message}</p>
        <p className="type-label mt-2">The link expires in an hour. You can close this tab.</p>
      </div>
    )
  }

  return (
    <div className="mt-10 space-y-6">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button variant="secondary" size="lg" className="w-full">
          <GoogleIcon /> Continue with Google
        </Button>
      </form>
      <div className="type-label flex items-center gap-3 text-dim">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <form action={action} className="space-y-2">
        <input type="hidden" name="next" value={next} />
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        {state && !state.ok ? <p className="text-[14px] text-leak-ink">{state.message}</p> : null}
        {error ? <p className="text-[14px] text-leak-ink">Sign-in failed. Please try again.</p> : null}
        <Button size="lg" className="mt-px w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null} Email me a sign-in link
        </Button>
      </form>
    </div>
  )
}
