'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Gift, Lock, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { setSubscriptionStatus } from '@/lib/actions/subscriptions'
import { formatShortDate } from '@/lib/dates'
import type { LockedRow, SubscriptionView } from '@/lib/data/types'
import { CYCLE_LABEL, cn, formatMoney } from '@/lib/utils'
import { ChargeHistory } from './charts'
import { UpgradeButton } from './upgrade'

const EASE = [0.16, 1, 0.3, 1] as const
const MONO_TONES = ['bg-butter', 'bg-lavender', 'bg-blush', 'bg-olive', 'bg-sky', 'bg-mustard', 'bg-lime']

/** A flat pastel tile with the service's initial — our stand-in for a logo. */
export function Monogram({ name, className }: { name: string; className?: string }) {
  const tone = MONO_TONES[[...name].reduce((t, c) => t + c.charCodeAt(0), 0) % MONO_TONES.length]
  return <span className={cn('grid size-10 shrink-0 place-items-center text-[14px] font-semibold', tone, className)}>{name.replace(/^The /, '')[0]}</span>
}

export const DIFFICULTY = {
  easy: { label: 'Easy cancel', tone: 'save' as const },
  medium: { label: 'Medium', tone: 'warn' as const },
  nightmare: { label: 'Nightmare', tone: 'leak' as const },
}

const STATUS_LABEL = { cancelling: 'Cancelling', cancelled: 'Cancelled', ignored: 'Ignored', active: null } as const

function LeakRow({ sub, isPro }: { sub: SubscriptionView; isPro: boolean }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const leaking = sub.yearlyWaste > 0
  const inactive = sub.status === 'cancelled' || sub.status === 'ignored'

  const update = (status: SubscriptionView['status'], message: string) =>
    startTransition(async () => {
      const res = await setSubscriptionStatus({ id: sub.id, status })
      if (res.ok) toast.success(message)
      else toast.error(res.error)
    })

  return (
    <li className={cn('bg-white', inactive && 'opacity-60')}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3.5 px-3 py-3 text-left transition-colors hover:bg-page sm:px-4">
        <Monogram name={sub.name} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[15px]">{sub.name}</span>
            {sub.isTeaser && !isPro ? (
              <Badge tone="insight">
                <Gift /> Free reveal
              </Badge>
            ) : null}
            {STATUS_LABEL[sub.status] ? <Badge tone={sub.status === 'cancelling' ? 'warn' : 'neutral'}>{STATUS_LABEL[sub.status]}</Badge> : null}
          </span>
          <span className="type-label mt-1 block truncate text-dim">
            {sub.leakReasons.length ? sub.leakReasons.slice(0, 2).map((r) => r.label).join(' · ') : `${sub.category} · looks healthy`}
          </span>
        </span>
        <span className="text-right">
          <span className={cn('tabular block text-[15px] font-semibold tracking-[-0.02em]', leaking && 'text-leak-ink')}>
            {leaking ? `${formatMoney(Math.round(sub.yearlyWaste))}/yr` : formatMoney(sub.cost, { cents: true }) + CYCLE_LABEL[sub.cycle]}
          </span>
          <span className="type-label tabular block text-dim">{leaking ? `${formatMoney(sub.cost, { cents: true })}${CYCLE_LABEL[sub.cycle]}` : `Waste Index ${sub.wasteScore}`}</span>
        </span>
        <Plus className={cn('size-4 shrink-0 transition-transform duration-500 ease-[var(--ease-cascade)]', open && 'rotate-45')} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
            <div className="grid grid-cols-1 gap-6 px-3 pt-1 pb-5 sm:px-4 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-[6px]">
                {sub.leakReasons.length ? (
                  sub.leakReasons.map((r) => (
                    <div key={r.kind} className="bg-page p-3">
                      <p className="flex items-center justify-between gap-3 text-[14px]">
                        <span>{r.label}</span>
                        {r.yearlyImpact > 0 ? <span className="tabular font-semibold text-leak-ink">{formatMoney(Math.round(r.yearlyImpact))}/yr</span> : null}
                      </p>
                      <p className="type-label mt-1 leading-relaxed text-dim">{r.detail}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-dim">No leak signals. Keep it if you use it.</p>
                )}
                <dl className="type-label grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <dt className="text-dim">Next charge</dt>
                    <dd className="mt-0.5 text-[14px]">{formatShortDate(sub.nextBillingDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-dim">Waste Index</dt>
                    <dd className="mt-0.5 text-[14px]">{sub.wasteScore}/100</dd>
                  </div>
                  <div>
                    <dt className="text-dim">Confidence</dt>
                    <dd className="mt-0.5 text-[14px]">{Math.round(sub.confidence * 100)}%</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col gap-4">
                <ChargeHistory history={sub.history} previousCost={sub.previousCost} />
                <div className="flex items-center gap-2">
                  <Badge tone={DIFFICULTY[sub.cancellationDifficulty].tone}>{DIFFICULTY[sub.cancellationDifficulty].label}</Badge>
                  <span className="type-label text-dim">{sub.category}</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-px">
                  {inactive ? (
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => update('active', `${sub.name} restored`)} className="bg-page">
                      Restore
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="sm">
                        <Link href={`/dashboard/cancel/${encodeURIComponent(sub.id)}`}>Cancel with Copilot</Link>
                      </Button>
                      <Button size="sm" variant="secondary" className="bg-page" disabled={pending} onClick={() => update('ignored', `${sub.name} ignored — it won’t count as waste`)}>
                        I use this
                      </Button>
                    </>
                  )}
                  {sub.cancellationUrl ? (
                    <Button asChild size="sm" variant="ghost">
                      <a href={sub.cancellationUrl} target="_blank" rel="noreferrer noopener">
                        Account page <ArrowUpRight />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  )
}

const SEVERITY = { high: 'bg-leak', medium: 'bg-mustard', low: 'bg-sand', none: 'bg-panel-2' }
const GHOST_WIDTHS = ['w-24', 'w-32', 'w-20', 'w-28', 'w-36']

function LockedRowView({ row, index }: { row: LockedRow; index: number }) {
  return (
    <li className="flex items-center gap-3.5 bg-white/60 px-3 py-3 sm:px-4">
      <span className="grid size-10 shrink-0 place-items-center bg-panel">
        <Lock className="size-4 text-dim" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block h-3.5 bg-panel-2 blur-[3px]', GHOST_WIDTHS[index % GHOST_WIDTHS.length])} aria-hidden />
        <span className="type-label mt-2 flex items-center gap-2 text-dim">
          <span className={cn('size-2 rounded-full', SEVERITY[row.severity])} />
          {row.category}
          {row.reasonLabel ? <span className="text-ink">· {row.reasonLabel}</span> : null}
        </span>
      </span>
      <span className="tabular text-[15px] text-dim blur-[4px] select-none" aria-hidden>
        $•••/yr
      </span>
    </li>
  )
}

export function LeakList({
  revealed,
  locked,
  isPro,
  yearlyWaste,
  limit,
  lockedPreview,
}: {
  revealed: SubscriptionView[]
  locked: LockedRow[]
  isPro: boolean
  yearlyWaste: number
  limit?: number
  /** Show only this many locked rows (the overview); the rest are summarised on the paywall card. */
  lockedPreview?: number
}) {
  const shown = limit ? revealed.slice(0, limit) : revealed
  const lockedLeaks = locked.filter((l) => l.severity !== 'none').length
  const teaserWaste = revealed.find((s) => s.isTeaser)?.yearlyWaste ?? 0
  const hiddenWaste = Math.max(0, yearlyWaste - teaserWaste)

  return (
    <div>
      <ul className="space-y-[3px]">
        {shown.map((s) => (
          <LeakRow key={s.id} sub={s} isPro={isPro} />
        ))}
      </ul>

      {!isPro && locked.length ? (
        <div className="relative mt-[3px]">
          <ul className="space-y-[3px]" aria-label={`${locked.length} locked subscriptions`}>
            {locked.slice(0, lockedPreview ?? locked.length).map((row, i) => (
              <LockedRowView key={row.slot} row={row} index={i} />
            ))}
          </ul>
          <div className={cn('absolute inset-x-0 flex justify-center px-4', lockedPreview ? 'top-1/2 -translate-y-1/2' : 'top-24')}>
            <div className="w-full max-w-sm bg-page p-6 text-center shadow-[0_30px_60px_-30px_rgb(60_60_60/0.45)]">
              <p className="type-title">
                {lockedLeaks} more {lockedLeaks === 1 ? 'leak' : 'leaks'}
              </p>
              <p className="mt-2 text-[14px] text-dim">
                worth <span className="tabular font-semibold text-leak-ink">{formatMoney(Math.round(hiddenWaste))}/yr</span> are hidden.
              </p>
              <UpgradeButton className="mt-5 w-full" reason={`${lockedLeaks} more leaks worth ${formatMoney(Math.round(hiddenWaste))}/yr are waiting behind the paywall.`}>
                Reveal all leaks
              </UpgradeButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
