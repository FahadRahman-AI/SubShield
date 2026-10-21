import { ArrowRight, Lock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { DarkPatternLibrary, FrictionMeter, PhoneScript } from '@/components/cancel/library'
import { Monogram } from '@/components/dashboard/leak-list'
import { PageSkeleton } from '@/components/dashboard/skeletons'
import { UpgradeButton, UpgradeProvider } from '@/components/dashboard/upgrade'
import { Badge } from '@/components/ui/badge'
import { requireViewer } from '@/lib/auth'
import { getCancellationHistory, getDashboard } from '@/lib/data/dashboard'
import { formatShortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/utils'

export const metadata: Metadata = { title: 'Cancel Copilot' }

export default function CancelPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-20">
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <Queue />
      </Suspense>
      <PhoneScript />
      <DarkPatternLibrary />
    </div>
  )
}

async function Queue() {
  const viewer = await requireViewer()
  const [data, history] = await Promise.all([getDashboard(viewer), getCancellationHistory(viewer)])
  const sentAt = new Map(history.map((h) => [h.subscriptionId, h.sentAt]))
  const queue = data.revealed.filter((s) => s.yearlyWaste > 0 && (s.status === 'active' || s.status === 'cancelling'))

  return (
    <UpgradeProvider yearlyWaste={data.totals.yearlyWaste} leakCount={data.totals.leakCount}>
      <header className="grid grid-cols-1 items-end gap-[10px] lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="type-label text-dim">Cancel Copilot</p>
          <h1 className="type-hero mt-4 max-w-[14ch]">Cut the cord, not your weekend</h1>
          <p className="mt-6 max-w-xl text-dim">A region-aware letter for each leak, sent with you in CC — plus the exact clicks past each vendor’s retention maze.</p>
        </div>
        <div className="flex min-h-[170px] flex-col justify-between bg-lime p-5">
          <p className="type-label">Saved per year so far</p>
          <p className="tabular text-[46px] leading-none font-semibold tracking-[-0.05em]">{formatMoney(Math.round(data.totals.savedYearly))}</p>
        </div>
      </header>

      <section className="mt-16" aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="type-title">
          Your cancellation queue
        </h2>
        {!data.hasData ? (
          <p className="mt-6 bg-panel p-8 text-center text-dim">
            Connect an account first —{' '}
            <Link href="/dashboard" className="text-ink underline-offset-4 hover:underline">
              run your scan
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-[3px] md:grid-cols-2">
            {queue.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/cancel/${encodeURIComponent(s.id)}`} className="group flex items-center gap-4 bg-white p-3 transition-colors hover:bg-panel-2 sm:p-4">
                  <Monogram name={s.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px]">{s.name}</span>
                      {s.status === 'cancelling' ? <Badge tone="warn">Sent {sentAt.get(s.id) ? formatShortDate(sentAt.get(s.id)!.slice(0, 10)) : ''}</Badge> : null}
                    </span>
                    <FrictionMeter difficulty={s.cancellationDifficulty} className="mt-1.5 text-dim" />
                  </span>
                  <span className="tabular text-[15px] font-semibold text-leak-ink">{formatMoney(Math.round(s.yearlyWaste))}/yr</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
            {!viewer.isPro && data.totals.leakCount > queue.length ? (
              <li className="flex flex-wrap items-center justify-between gap-4 bg-panel p-4 md:col-span-2">
                <span className="flex items-center gap-3 text-[14px]">
                  <Lock className="size-4" /> {data.totals.leakCount - queue.length} more leaks are waiting in your queue.
                </span>
                <UpgradeButton size="sm">Unlock queue</UpgradeButton>
              </li>
            ) : null}
            {queue.length === 0 && viewer.isPro ? <li className="bg-panel p-8 text-center text-dim md:col-span-2">Queue cleared. Nothing left leaking.</li> : null}
          </ul>
        )}
      </section>
    </UpgradeProvider>
  )
}
