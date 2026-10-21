import { Lock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { CancelStudio } from '@/components/cancel/cancel-studio'
import { PageSkeleton } from '@/components/dashboard/skeletons'
import { UpgradeButton, UpgradeProvider } from '@/components/dashboard/upgrade'
import { requireViewer } from '@/lib/auth'
import { GENERIC_CANCEL_GUIDE, getMerchant } from '@/lib/catalog/merchants'
import { getCancellationHistory, getDashboard, getSubscriptionForViewer } from '@/lib/data/dashboard'
import { isoDate } from '@/lib/dates'

export const metadata: Metadata = { title: 'Cancel' }

export default function CancelSubscriptionPage({ params }: PageProps<'/dashboard/cancel/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <Studio params={params} />
    </Suspense>
  )
}

async function Studio({ params }: { params: PageProps<'/dashboard/cancel/[id]'>['params'] }) {
  const { id } = await params
  const viewer = await requireViewer()
  const sub = await getSubscriptionForViewer(viewer, decodeURIComponent(id))

  if (!sub) {
    // Either it doesn't exist, or it's behind the paywall — don't say which.
    const data = await getDashboard(viewer)
    return (
      <UpgradeProvider yearlyWaste={data.totals.yearlyWaste} leakCount={data.totals.leakCount}>
        <div className="mx-auto mt-16 max-w-md bg-panel p-10 text-center">
          <Lock className="mx-auto size-6" />
          <h1 className="type-title mt-5">This leak is locked</h1>
          <p className="mt-2 text-[14px] text-dim">Upgrade to see every subscription and cancel it in one click.</p>
          <div className="mt-6 flex justify-center gap-px">
            {!viewer.isPro ? <UpgradeButton>Unlock Pro</UpgradeButton> : null}
            <Link href="/dashboard/cancel" className="inline-flex h-12 items-center bg-white px-5 text-[13.5px] hover:bg-panel-2">
              Back
            </Link>
          </div>
        </div>
      </UpgradeProvider>
    )
  }

  const [data, history] = await Promise.all([getDashboard(viewer), getCancellationHistory(viewer)])
  const merchant = getMerchant(sub.merchantKey.replace(/-\d+$/, '')) ?? getMerchant(sub.merchantKey)
  const guide = merchant?.cancel ?? { ...GENERIC_CANCEL_GUIDE, url: sub.cancellationUrl ?? '' }
  const sentAt = history.find((h) => h.subscriptionId === sub.id && h.status !== 'draft')?.sentAt ?? null

  return (
    <UpgradeProvider yearlyWaste={data.totals.yearlyWaste} leakCount={data.totals.leakCount}>
      <CancelStudio
        sub={sub}
        guide={guide}
        user={{ name: viewer.name ?? viewer.email, email: viewer.email, region: viewer.region }}
        isPro={viewer.isPro}
        demo={viewer.mode === 'demo'}
        today={isoDate(new Date())}
        sentAt={sentAt}
      />
    </UpgradeProvider>
  )
}
