'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/form'
import type { DashboardData, SubscriptionView } from '@/lib/data/types'
import { cn, formatMoney } from '@/lib/utils'
import { LeakList } from './leak-list'
import { UpgradeButton, UpgradeProvider } from './upgrade'

const FILTERS = [
  { id: 'all', label: 'All', test: (s: SubscriptionView) => s.status === 'active' || s.status === 'cancelling' },
  { id: 'leaking', label: 'Leaking', test: (s: SubscriptionView) => (s.status === 'active' || s.status === 'cancelling') && s.yearlyWaste > 0 },
  { id: 'healthy', label: 'Healthy', test: (s: SubscriptionView) => s.status === 'active' && s.yearlyWaste === 0 },
  { id: 'done', label: 'Cancelled & ignored', test: (s: SubscriptionView) => s.status === 'cancelled' || s.status === 'ignored' },
] as const

export function SubscriptionsView({ data }: { data: DashboardData }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [query, setQuery] = useState('')
  const isPro = data.viewer.isPro

  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!
    const q = query.trim().toLowerCase()
    return data.revealed.filter((s) => f.test(s) && (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)))
  }, [data.revealed, filter, query])

  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, data.revealed.filter(f.test).length]))

  return (
    <UpgradeProvider yearlyWaste={data.totals.yearlyWaste} leakCount={data.totals.leakCount}>
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="type-display">Subscriptions</h1>
            <p className="mt-3 text-dim">
              {data.totals.activeCount} recurring charges · {formatMoney(Math.round(data.totals.yearlySpend))}/yr ·{' '}
              <span className="font-semibold text-leak-ink">{formatMoney(Math.round(data.totals.yearlyWaste))}/yr leaking</span>
            </p>
          </div>
          {!isPro ? <UpgradeButton>Reveal all</UpgradeButton> : null}
        </header>

        {isPro ? (
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-px" role="tablist" aria-label="Filter">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn('h-10 px-4 text-[13.5px] transition-colors', filter === f.id ? 'bg-ink text-white' : 'bg-white hover:bg-panel-2')}
                >
                  {f.label} <span className="tabular opacity-60">{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-dim" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-10 pl-10" aria-label="Search subscriptions" />
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          {list.length || !isPro ? (
            <LeakList revealed={isPro ? list : data.revealed} locked={data.locked} isPro={isPro} yearlyWaste={data.totals.yearlyWaste} />
          ) : (
            <p className="bg-panel p-8 text-center text-dim">Nothing here.</p>
          )}
        </div>
      </div>
    </UpgradeProvider>
  )
}
