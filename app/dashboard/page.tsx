import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ConnectHero } from '@/components/dashboard/connect-flow'
import { OverviewView } from '@/components/dashboard/overview-view'
import { DashboardSkeleton } from '@/components/dashboard/skeletons'
import { requireViewer } from '@/lib/auth'
import { getDashboard } from '@/lib/data/dashboard'

export const metadata: Metadata = { title: 'Overview' }

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Overview />
    </Suspense>
  )
}

async function Overview() {
  const viewer = await requireViewer()
  const data = await getDashboard(viewer)
  if (!data.hasData) return <ConnectHero demo={viewer.mode === 'demo'} />
  return <OverviewView data={data} />
}
