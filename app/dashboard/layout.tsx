import { Suspense } from 'react'
import { ScanProvider } from '@/components/dashboard/connect-flow'
import { MobileNav, Sidebar } from '@/components/dashboard/sidebar'
import { UserChip } from '@/components/dashboard/user-chip'
import { Skeleton } from '@/components/ui/form'

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar
        footer={
          <Suspense fallback={<Skeleton className="h-14 bg-panel-2" />}>
            <UserChip />
          </Suspense>
        }
      />
      <main className="gutter min-w-0 flex-1 pt-8 pb-28 lg:pb-14">
        <ScanProvider>{children}</ScanProvider>
      </main>
      <MobileNav />
    </div>
  )
}
