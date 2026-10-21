import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { getViewer } from '@/lib/auth'
import { signOut } from '@/lib/actions/auth'
import { SentryUser } from '@/components/observability/sentry-user'

export async function UserChip() {
  const viewer = await getViewer()
  if (!viewer) return null
  const initials = (viewer.name ?? viewer.email)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return (
    <div className="space-y-px">
      <SentryUser id={viewer.mode === 'live' ? viewer.id : null} />
      {viewer.isPro ? null : (
        <Link href="/dashboard/settings" className="block bg-coral p-4 transition-colors hover:bg-[#f47148]">
          <p className="text-[15px] font-semibold tracking-[-0.02em]">Unlock every leak</p>
          <p className="type-label mt-1">Pro pays for itself with one cancellation.</p>
        </Link>
      )}
      {viewer.mode === 'demo' ? <p className="type-label bg-lavender px-4 py-2.5">Demo mode — seeded data, no keys configured.</p> : null}
      <div className="flex items-center gap-3 bg-white px-3 py-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-sand text-[12px] font-semibold">{initials}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px]">{viewer.name ?? 'Your account'}</span>
          <span className="type-label block truncate text-dim">{viewer.isPro ? `Pro · ${viewer.plan ?? 'active'}` : 'Free plan'}</span>
        </span>
        <form action={signOut}>
          <button className="grid size-9 place-items-center transition-colors hover:bg-panel-2" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
