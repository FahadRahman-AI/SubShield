'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Accordion } from 'radix-ui'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getMerchant, OVERLAP_LABELS } from '@/lib/catalog/merchants'
import { findOverlaps } from '@/lib/detection/overlap'
import { cn, formatMoney } from '@/lib/utils'

// Left: the overlap check (same overlap rules as the real engine).
// Right: questions, answered. Side by side, like a quiz next to a help desk.

const OPTIONS: { key: string; price: number }[] = [
  { key: 'netflix', price: 17.99 },
  { key: 'hulu', price: 18.99 },
  { key: 'hbo-max', price: 16.99 },
  { key: 'disney-plus', price: 15.99 },
  { key: 'spotify', price: 11.99 },
  { key: 'apple-music', price: 10.99 },
  { key: 'youtube-premium', price: 13.99 },
  { key: 'icloud', price: 2.99 },
  { key: 'google-one', price: 1.99 },
  { key: 'chatgpt', price: 20 },
  { key: 'perplexity', price: 20 },
  { key: 'dashpass', price: 9.99 },
]

const DEFAULT = new Set(['netflix', 'hulu', 'spotify', 'apple-music', 'icloud', 'google-one'])

const FAQ = [
  {
    q: 'Can SubShield move money or see my bank password?',
    a: 'No. Bank connections go through Plaid with read-only transaction access. We never see your credentials and can’t move funds. Disconnect from the Connections page and the token is revoked.',
  },
  {
    q: 'Does SubShield cancel for me?',
    a: 'Pro writes a cancellation request based on your region’s consumer-protection rules and sends it to the vendor with you in CC; replies go to you. For vendors that only cancel in-app, by phone or in person, you get the exact steps and a phone script.',
  },
  {
    q: 'What does the inbox scan read?',
    a: 'Only metadata and the short preview snippet of emails that look like receipts, renewals, price changes or cancellation confirmations. We never send mail as you and never store full messages.',
  },
  {
    q: 'How accurate is detection?',
    a: 'The engine needs a real pattern — regular intervals and consistent amounts. Unknown merchants need at least three charges. Every subscription shows its confidence and the charges behind it.',
  },
  {
    q: 'How do I cancel SubShield?',
    a: 'One click in Plan & alerts, through the Stripe portal. No retention flow. We’d be hypocrites otherwise.',
  },
]

export function CheckAndAsk() {
  const [selected, setSelected] = useState<Set<string>>(DEFAULT)

  const result = useMemo(() => {
    const picked = OPTIONS.filter((o) => selected.has(o.key)).map((o) => ({ ...o, merchant: getMerchant(o.key)! }))
    const overlaps = findOverlaps(picked, (p) => p.merchant.overlap, (p) => p.price * 12).map((set) => ({
      group: set.group,
      count: set.members.length,
      keep: set.kept.merchant.name,
      savings: set.redundant.reduce((s, p) => s + p.price * 12, 0),
    }))
    return { yearly: picked.reduce((s, p) => s + p.price * 12, 0), overlaps, savings: overlaps.reduce((s, o) => s + o.savings, 0) }
  }, [selected])

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <section id="check" className="gutter grid scroll-mt-16 grid-cols-1 gap-[10px] py-24 lg:grid-cols-2">
      <div className="bg-panel-2 p-5 sm:p-8">
        <h2 className="type-display flex items-center gap-4">
          <span aria-hidden className="size-3 shrink-0 rounded-full bg-ink sm:size-4" />
          Overlap check
        </h2>
        <p className="mt-4 text-dim">Tap what you pay for. Same overlap rules as the real engine.</p>
        <div className="mt-8 grid grid-cols-1 gap-[6px] sm:grid-cols-2">
          {OPTIONS.map((o) => {
            const on = selected.has(o.key)
            return (
              <button
                key={o.key}
                onClick={() => toggle(o.key)}
                aria-pressed={on}
                className="flex h-12 items-center justify-between bg-white px-4 text-left text-[13.5px] transition-colors hover:bg-page"
              >
                <span>
                  {getMerchant(o.key)!.name} <span className="text-dim">${o.price}</span>
                </span>
                <span className={cn('grid size-4 place-items-center rounded-full border border-ink', on && 'bg-ink')}>
                  {on ? <span className="size-1.5 rounded-full bg-white" /> : null}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-6 bg-page p-4 text-[13.5px]">
          <p className="flex items-baseline justify-between">
            <span className="text-dim">You spend</span>
            <span className="tabular text-[19px] font-semibold tracking-[-0.03em]">{formatMoney(Math.round(result.yearly))}/yr</span>
          </p>
          <p className="mt-1 flex items-baseline justify-between">
            <span className="text-dim">Overlap you could cut</span>
            <span className="tabular text-[19px] font-semibold tracking-[-0.03em] text-leak-ink">{formatMoney(Math.round(result.savings))}/yr</span>
          </p>
          <ul className="mt-3 space-y-1 text-dim">
            {result.overlaps.length ? (
              result.overlaps.map((o) => (
                <li key={o.group}>
                  {o.count} {OVERLAP_LABELS[o.group]} — keep {o.keep}, rotate the rest.
                </li>
              ))
            ) : (
              <li>No overlaps in this selection.</li>
            )}
          </ul>
        </div>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/login" data-track="overlap-check">
            Scan my real charges
          </Link>
        </Button>
      </div>

      <div className="p-5 sm:p-8">
        <h2 className="type-display flex items-center gap-4 text-dim">
          <span aria-hidden className="size-3 shrink-0 rounded-full bg-ink/40 sm:size-4" />
          Ask a question
        </h2>
        <Accordion.Root type="single" collapsible className="mt-10 space-y-[6px]">
          {FAQ.map((item, i) => (
            <Accordion.Item key={item.q} value={`q${i}`} className="bg-white">
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-[14px]">
                  {item.q}
                  <Plus className="size-4 shrink-0 transition-transform duration-500 ease-[var(--ease-cascade)] group-data-[state=open]:rotate-45" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden px-4 text-[13.5px] leading-relaxed text-dim data-[state=closed]:animate-[collapse_.3s_ease-out] data-[state=open]:animate-[expand_.45s_var(--ease-out-expo)]">
                <p className="pb-4">{item.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  )
}
