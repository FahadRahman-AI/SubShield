import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ConnectHero } from '@/components/dashboard/connect-flow'
import { PageSkeleton } from '@/components/dashboard/skeletons'
import { SubscriptionsView } from '@/components/dashboard/subscriptions-view'
import { requireViewer } from '@/lib/auth'
import { getDashboard } from '@/lib/data/dashboard'

export const metadata: Metadata = { title: 'Subscriptions' }

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <Subscriptions />
    </Suspense>
  )
}

async function Subscriptions() {
  const viewer = await requireViewer()
  const data = await getDashboard(viewer)
  if (!data.hasData) return <ConnectHero demo={viewer.mode === 'demo'} />
  return <SubscriptionsView data={data} />
}
