import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SettingsView } from '@/components/dashboard/settings-view'
import { PageSkeleton } from '@/components/dashboard/skeletons'
import { requireViewer } from '@/lib/auth'
import { getDashboard } from '@/lib/data/dashboard'

export const metadata: Metadata = { title: 'Plan & alerts' }

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Settings />
    </Suspense>
  )
}

async function Settings() {
  const viewer = await requireViewer()
  const data = await getDashboard(viewer)
  return <SettingsView viewer={viewer} yearlyWaste={data.totals.yearlyWaste} leakCount={data.totals.leakCount} />
}
