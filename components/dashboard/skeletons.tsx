import { Skeleton } from '@/components/ui/form'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-3 h-12 w-96 max-w-full" />
      <div className="mt-10 grid grid-cols-1 gap-[10px] lg:grid-cols-12">
        <Skeleton className="h-80 lg:col-span-7" />
        <div className="grid grid-cols-2 gap-[10px] lg:col-span-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-full min-h-36" />
          ))}
        </div>
        <Skeleton className="h-[480px] lg:col-span-8" />
        <Skeleton className="h-[480px] lg:col-span-4" />
      </div>
    </div>
  )
}

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-5xl" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12 w-80 max-w-full" />
      <Skeleton className="mt-4 h-4 w-96 max-w-full" />
      <div className="mt-10 space-y-[3px]">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  )
}
