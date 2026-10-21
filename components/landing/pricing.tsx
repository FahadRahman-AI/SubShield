'use client'

import { Lock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PRICING, YEARLY_SAVINGS_PCT } from '@/lib/pricing'
import { cn } from '@/lib/utils'

type Period = 'monthly' | 'yearly'

/** Swatch-style picker: two dots, like choosing a colour. */
export function BillingToggle({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <div>
      <p className="type-label">Pick a plan</p>
      <div className="mt-2 flex items-center gap-2" role="radiogroup" aria-label="Billing period">
        {(['monthly', 'yearly'] as const).map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={value === p}
            onClick={() => onChange(p)}
            className={cn('flex items-center gap-1.5 text-[12.5px]', value === p && 'font-semibold')}
          >
            <span className={cn('grid size-[18px] place-items-center rounded-full', value === p && 'ring-1 ring-ink ring-offset-1 ring-offset-transparent')}>
              <span className={cn('size-3.5 rounded-full', p === 'monthly' ? 'bg-white' : 'bg-ink')} />
            </span>
            {p === 'monthly' ? 'Monthly' : `Yearly −${YEARLY_SAVINGS_PCT}%`}
          </button>
        ))}
      </div>
    </div>
  )
}

function Rows({ locked }: { locked: boolean }) {
  const rows = [
    ['The New York Times', 'Promo ended', '$252'],
    ['Perplexity Pro', 'Overlaps ChatGPT Plus', '$240'],
    ['Netflix', 'Price up 16%', '$216'],
    ['Planet Fitness', 'Likely unused', '$204'],
  ]
  return (
    <ul className="w-full max-w-sm space-y-[3px]">
      {rows.map(([name, reason, amount], i) => {
        const hidden = locked && i > 0
        return (
          <li key={name} className="flex items-center gap-3 bg-page/80 px-3 py-2.5 text-[13px]">
            <span className={cn('size-7 shrink-0', ['bg-butter', 'bg-lavender', 'bg-blush', 'bg-olive'][i])} />
            <span className={cn('min-w-0 flex-1', hidden && 'blur-[5px] select-none')} aria-hidden={hidden}>
              <span className="block truncate">{name}</span>
              <span className="block truncate text-[11px] text-dim">{reason}</span>
            </span>
            {hidden ? <Lock className="size-3.5 text-dim" /> : <span className="font-semibold text-leak-ink">{amount}</span>}
          </li>
        )
      })}
    </ul>
  )
}

export function Pricing() {
  const [period, setPeriod] = useState<Period>('yearly')
  const price = PRICING[period]

  return (
    <section id="pricing" className="grid scroll-mt-16 grid-cols-1 md:grid-cols-2">
      <div className="flex min-h-[600px] flex-col bg-panel md:min-h-[760px]">
        <div className="grid flex-1 place-items-center px-6 py-16">
          <Rows locked />
        </div>
        <div className="gutter flex flex-wrap items-end justify-between gap-6 pb-6">
          <div className="flex items-end gap-10">
            <div>
              <p className="type-label text-dim">SubShield Free</p>
              <p className="type-title mt-1">$0</p>
            </div>
            <p className="type-label max-w-[18ch] text-dim">Your total waste and the biggest leak, revealed.</p>
          </div>
          <div className="flex gap-px">
            <Button asChild variant="secondary">
              <a href="#check">Learn more</a>
            </Button>
            <Button asChild>
              <Link href="/login" data-track="pricing-free">
                Start free
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-[600px] flex-col bg-sand md:min-h-[760px]">
        <div className="grid flex-1 place-items-center px-6 py-16">
          <Rows locked={false} />
        </div>
        <div className="gutter flex flex-wrap items-end justify-between gap-6 pb-6">
          <div className="flex items-end gap-10">
            <div>
              <p className="type-label">SubShield Pro</p>
              <p className="type-title mt-1">
                {period === 'yearly' ? `From $${PRICING.yearly.monthlyEquivalent}` : price.label}
                <span className="text-[15px] font-normal tracking-normal">/mo</span>
              </p>
            </div>
            <BillingToggle value={period} onChange={setPeriod} />
          </div>
          <div className="flex gap-px">
            <Button asChild variant="secondary">
              <a href="#check">Learn more</a>
            </Button>
            <Button asChild>
              <Link href="/login" data-track="pricing-pro">
                Get Pro
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
