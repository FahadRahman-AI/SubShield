import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { ConnectionsView } from '@/components/dashboard/connections-view'
import { PageSkeleton } from '@/components/dashboard/skeletons'
import { requireViewer } from '@/lib/auth'
import { getDashboard } from '@/lib/data/dashboard'
import { isBankRegionRestricted, visitorCountry } from '@/lib/geo'

export const metadata: Metadata = { title: 'Connections' }

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Connections />
    </Suspense>
  )
}

async function Connections() {
  const viewer = await requireViewer()
  const data = await getDashboard(viewer)
  return (
    <ConnectionsView
      connections={data.connections}
      demo={viewer.mode === 'demo'}
      regionRestricted={isBankRegionRestricted(visitorCountry(await headers()))}
    />
  )
}
