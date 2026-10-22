'use client'

import { motion } from 'framer-motion'
import { Loader2, Lock } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { CountUp } from '@/components/motion/count-up'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bullet, Panel } from '@/components/ui/panel'
import { resyncNow } from '@/lib/actions/connections'
import { daysBetween, formatShortDate, isoDate } from '@/lib/dates'
import type { DashboardData } from '@/lib/data/types'
import { CYCLE_LABEL, cn, formatMoney } from '@/lib/utils'
import { CategoryDonut } from './charts'
import { useScan } from './connect-flow'
import { LeakList } from './leak-list'
import { UpgradeButton, UpgradeProvider } from './upgrade'
import { track } from '@/lib/analytics'

const EASE = [0.16, 1, 0.3, 1] as const

function Tile({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.8, ease: EASE }} className={className}>
      {children}
    </motion.div>
  )
}

function relative(iso: string | null) {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

function UpgradedToast() {
  const params = useSearchParams()
  const shown = useRef(false)
  useEffect(() => {
    if (shown.current) return
    if (params.get('upgraded')) {
      shown.current = true
      track('pro_unlocked', { via: 'stripe' })
      toast.success('Welcome to Pro', { description: 'Every leak is now revealed. Live monitoring is on.' })
    } else if (params.get('checkout') === 'cancelled') {
      shown.current = true
      toast('Checkout cancelled', { description: 'No charge was made.' })
    }
  }, [params])
  return null
}

function SyncButton() {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await resyncNow()
          if (res.ok) toast.success('Synced', { description: `${res.data?.subscriptions ?? 0} recurring charges tracked.` })
          else toast.error(res.error)
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : null} Sync now
    </Button>
  )
}

const INSIGHT_TONE = { leak: 'bg-coral', insight: 'bg-lavender', warn: 'bg-mustard', save: 'bg-lime' }

export function OverviewView({ data }: { data: DashboardData }) {
  const { totals, viewer } = data
  const isPro = viewer.isPro
  const { revealKey } = useScan()
  const today = isoDate(new Date())
  const wasteShare = totals.yearlySpend ? Math.min(1, totals.yearlyWaste / totals.yearlySpend) : 0
  const firstName = viewer.name?.split(' ')[0]

  return (
    <UpgradeProvider yearlyWaste={totals.yearlyWaste} leakCount={totals.leakCount}>
      <UpgradedToast />
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="type-label text-dim">
              {data.connections.length} {data.connections.length === 1 ? 'connection' : 'connections'} · synced {relative(data.lastSyncedAt)}
            </p>
            <h1 className="type-display mt-3 max-w-[18ch]">{firstName ? `Here’s your leak report, ${firstName}` : 'Your leak report'}</h1>
          </div>
          <div className="flex gap-px">
            <SyncButton />
            {isPro ? (
              <Button asChild>
                <Link href="/dashboard/cancel">Start cutting</Link>
              </Button>
            ) : (
              <UpgradeButton>Unlock Pro</UpgradeButton>
            )}
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-[10px] lg:grid-cols-12">
          {/* Waste hero */}
          <Tile className="lg:col-span-7">
            <Panel className="flex h-full min-h-[360px] flex-col p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <Bullet>Estimated yearly waste</Bullet>
                <Badge tone="leak">{totals.leakCount} leaks</Badge>
              </div>
              <p className="tabular mt-auto pt-10 text-[clamp(3.5rem,8vw,6rem)] leading-none font-semibold tracking-[-0.05em]">
                <CountUp key={revealKey} value={Math.round(totals.yearlyWaste)} prefix="$" duration={2.2} />
                <span className="ml-2 text-[20px] font-normal tracking-normal text-dim">/yr</span>
              </p>
              <p className="mt-4 max-w-md text-[15px] text-dim">
                drained from {formatMoney(Math.round(totals.yearlySpend))}/yr of recurring charges — <span className="text-ink">{Math.round(wasteShare * 100)}%</span> of
                everything you subscribe to. An estimate from your charges, not financial advice.
              </p>
              <div className="mt-6">
                <div className="flex h-2 bg-panel-2" role="img" aria-label={`${Math.round(wasteShare * 100)}% of recurring spend is waste`}>
                  <motion.div key={revealKey} initial={{ width: 0 }} animate={{ width: `${wasteShare * 100}%` }} transition={{ duration: 1.6, delay: 0.3, ease: EASE }} className="h-full bg-leak" />
                </div>
                <div className="type-label mt-2 flex justify-between text-dim">
                  <span>Waste</span>
                  <span>Kept value {formatMoney(Math.round(totals.yearlySpend - totals.yearlyWaste))}</span>
                </div>
              </div>
              <div className="mt-7">
                {isPro ? (
                  <Button asChild>
                    <Link href="/dashboard/cancel">Cut {formatMoney(Math.round(totals.yearlyWaste))} now</Link>
                  </Button>
                ) : (
                  <UpgradeButton reason={`You’re losing ${formatMoney(Math.round(totals.yearlyWaste))} a year. Pro shows every leak and cancels them for you.`}>
                    <Lock /> Reveal all {totals.leakCount} leaks
                  </UpgradeButton>
                )}
              </div>
            </Panel>
          </Tile>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-[10px] lg:col-span-5">
            {[
              { label: 'Monthly recurring', value: totals.monthlySpend, prefix: '$', tone: 'bg-panel' },
              { label: 'Active subscriptions', value: totals.activeCount, prefix: '', tone: 'bg-panel' },
              { label: 'Avg. Waste Index', value: totals.avgWasteScore, prefix: '', suffix: '/100', tone: 'bg-lavender' },
              { label: 'Saved per year', value: totals.savedYearly, prefix: '$', tone: 'bg-lime' },
            ].map((t, i) => (
              <Tile key={t.label} delay={0.06 + i * 0.05}>
                <div className={cn('flex h-full min-h-[150px] flex-col justify-between p-5', t.tone)}>
                  <p className="type-label">{t.label}</p>
                  <p className="tabular text-[34px] leading-none font-semibold tracking-[-0.04em]">
                    <CountUp key={revealKey} value={Math.round(t.value)} prefix={t.prefix} suffix={t.suffix ?? ''} duration={1.6} delay={0.2} />
                  </p>
                </div>
              </Tile>
            ))}
          </div>

          {/* Leaks */}
          <Tile delay={0.12} className="lg:col-span-8">
            <Panel className="h-full p-4 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="type-title">Leaks, biggest first</h2>
                <Link href="/dashboard/subscriptions" className="type-label hover:underline">
                  All subscriptions →
                </Link>
              </div>
              <LeakList
                revealed={data.revealed.filter((s) => s.status === 'active' || s.status === 'cancelling')}
                locked={data.locked}
                isPro={isPro}
                yearlyWaste={totals.yearlyWaste}
                limit={isPro ? 8 : undefined}
                lockedPreview={6}
              />
            </Panel>
          </Tile>

          <div className="flex flex-col gap-[10px] lg:col-span-4">
            <Tile delay={0.16}>
              <Panel tone="sand" className="p-5 sm:p-6">
                <Bullet>Insights</Bullet>
                <ul className="mt-5 space-y-[3px]">
                  {data.insights.length ? (
                    data.insights.slice(0, 4).map((ins) => (
                      <li key={ins.id} className="bg-page p-3.5">
                        <p className="flex items-start justify-between gap-3 text-[14px]">
                          <span className="flex items-start gap-2">
                            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', INSIGHT_TONE[ins.tone])} />
                            {ins.title}
                          </span>
                          {ins.yearly > 0 ? <span className="tabular shrink-0 font-semibold text-leak-ink">{formatMoney(Math.round(ins.yearly))}/yr</span> : null}
                        </p>
                        <p className="type-label mt-1 pl-4 leading-relaxed text-dim">{ins.body}</p>
                      </li>
                    ))
                  ) : (
                    <li className="text-[14px] text-dim">Nothing urgent. Nice.</li>
                  )}
                </ul>
              </Panel>
            </Tile>

            <Tile delay={0.2}>
              <Panel className="p-5 sm:p-6">
                <CategoryDonut categories={data.categories} />
              </Panel>
            </Tile>

            <Tile delay={0.24}>
              <Panel className="p-5 sm:p-6">
                <Bullet>Renewing in the next 30 days</Bullet>
                <ol className="mt-5 space-y-[3px]">
                  {data.upcoming.slice(0, 7).map((u) => {
                    const days = daysBetween(today, u.date)
                    return (
                      <li key={u.slot} className="flex items-center gap-3 bg-white px-3 py-2.5 text-[14px]">
                        <span className={cn('tabular w-12 shrink-0 text-[12.5px]', days <= 3 ? 'font-semibold text-warn-ink' : 'text-dim')}>
                          {days === 0 ? 'Today' : days === 1 ? 'Tmrw' : `${days}d`}
                        </span>
                        {u.name ? (
                          <span className="flex-1 truncate">{u.name}</span>
                        ) : (
                          <span className="flex flex-1 items-center gap-2 text-dim">
                            <Lock className="size-3" />
                            <span className="h-2.5 w-20 bg-panel-2 blur-[2px]" />
                          </span>
                        )}
                        <span className="tabular text-[12.5px]">
                          {formatMoney(u.cost, { cents: true })}
                          {CYCLE_LABEL[u.cycle]}
                        </span>
                      </li>
                    )
                  })}
                  {data.upcoming.length === 0 ? <li className="text-[14px] text-dim">No renewals this month.</li> : null}
                </ol>
                <p className="type-label mt-4 text-dim">
                  {isPro ? (viewer.alertEmail || viewer.alertSms ? 'You’ll get an alert 3 days before each one.' : 'Turn on alerts in Plan & alerts.') : 'Pro alerts you 3 days before each charge.'}
                </p>
              </Panel>
            </Tile>

            <Tile delay={0.28}>
              <Panel className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <Bullet>Live monitoring</Bullet>
                  {isPro ? <Badge tone="save">On</Badge> : null}
                </div>
                {isPro ? (
                  <ul className="mt-5 space-y-[3px]">
                    {data.alerts.length ? (
                      data.alerts.map((a) => (
                        <li key={a.id} className="bg-white px-3 py-2.5">
                          <p className="text-[14px]">{a.title}</p>
                          <p className="type-label mt-0.5 text-dim">
                            {a.body} · {formatShortDate(a.createdAt.slice(0, 10))}
                          </p>
                        </li>
                      ))
                    ) : (
                      <li className="text-[14px] text-dim">We’ll flag new subscriptions and price hikes here the day they post.</li>
                    )}
                  </ul>
                ) : (
                  <div className="mt-5">
                    <p className="text-[14px] text-dim">Get flagged the day a new subscription or price hike posts — not months later.</p>
                    <UpgradeButton variant="secondary" size="sm" className="mt-4" reason="Live monitoring watches every new charge via your bank feed and alerts you to new subscriptions and price hikes.">
                      Turn on monitoring
                    </UpgradeButton>
                  </div>
                )}
              </Panel>
            </Tile>
          </div>
        </div>
      </div>
    </UpgradeProvider>
  )
}
