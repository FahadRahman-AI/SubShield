'use client'

import { motion } from 'framer-motion'
import { BellRing, ChevronRight, Copy, Ghost, Hourglass, Scissors, TrendingUp, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion/reveal'
import { Bullet, Panel } from '@/components/ui/panel'
import { cn } from '@/lib/utils'

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Reveal>
      <h2 className={cn('type-display', className)}>{children}</h2>
    </Reveal>
  )
}

/** A small pastel tile set inline with display text. */
function Chip({ tone, icon: Icon }: { tone: string; icon: typeof Scissors }) {
  return (
    <span aria-hidden className={cn('mx-[0.08em] inline-grid h-[0.78em] w-[0.62em] translate-y-[0.06em] place-items-center align-baseline', tone)}>
      <Icon className="size-[0.38em]" strokeWidth={1.75} />
    </span>
  )
}

export function Statement() {
  return (
    <section id="how" className="gutter scroll-mt-20 py-28 sm:py-40">
      <Reveal>
        <p className="type-display mx-auto max-w-[19ch] text-center">
          Subscriptions are built <Chip tone="bg-lavender" icon={Hourglass} /> to be forgotten. SubShield remembers every charge <Chip tone="bg-butter" icon={TrendingUp} />, and
          cuts <Chip tone="bg-coral" icon={Scissors} /> the ones you’d never miss.
        </p>
      </Reveal>
    </section>
  )
}

const STEPS = [
  { title: 'Read-only by design', line: 'We can see charges. We can’t move a cent.' },
  { title: 'Six leak detectors', line: 'Hikes, doubles, overlaps, trials, zombies and renewals.' },
  { title: 'Cancels for you', line: 'A letter that cites your rights, sent in one click.' },
]

export function NumberedCards() {
  return (
    <section className="gutter py-20">
      <SectionTitle>Built to cut</SectionTitle>
      <div className="mt-10 grid grid-cols-1 gap-[10px] md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <Panel className="flex h-[340px] flex-col justify-between p-5 sm:h-[420px]">
              <Bullet>{s.title}</Bullet>
              <p className="type-title mx-auto max-w-[15ch] text-center">{s.line}</p>
              <p className="type-label tabular">0{i + 1}</p>
            </Panel>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const LEAK_TYPES = [
  { name: 'Price hike', tone: 'bg-blush', icon: TrendingUp, offset: 'mt-0' },
  { name: 'Billed twice', tone: 'bg-olive', icon: Copy, offset: 'mt-8' },
  { name: 'Overlapping services', tone: 'bg-lavender', icon: Copy, offset: 'mt-2' },
  { name: 'Trial converted', tone: 'bg-butter', icon: Hourglass, offset: 'mt-10' },
  { name: 'Charged after cancel', tone: 'bg-coral', icon: XCircle, offset: 'mt-4' },
  { name: 'Likely unused', tone: 'bg-sky', icon: Ghost, offset: 'mt-12' },
  { name: 'Renewal coming', tone: 'bg-mustard', icon: BellRing, offset: 'mt-1' },
]

/** A staggered row of tiles — one per kind of leak the engine detects. */
export function LeakStrip() {
  return (
    <section className="py-20">
      <div className="gutter">
        <Reveal>
          <p className="type-display mx-auto max-w-[22ch] text-center">Every kind of leak has a shape. We know all of them.</p>
        </Reveal>
      </div>
      <div className="gutter mt-14 flex snap-x gap-[10px] overflow-x-auto pb-4 lg:overflow-visible">
        {LEAK_TYPES.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.06, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className={cn('flex aspect-[3/4] w-[44vw] shrink-0 snap-start flex-col justify-between p-3 sm:w-[30vw] lg:w-auto lg:flex-1', t.tone, t.offset)}
          >
            <t.icon className="mt-2 size-9 self-center" strokeWidth={1.1} />
            <p className="type-label">{t.name}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

const CAUGHT = [
  { handle: '@price-hike', body: 'A streaming plan went from $15.49 to $17.99 a month — the kind of change that slides by on a busy statement.', impact: '+$30/yr' },
  { handle: '@charged-after-cancel', body: 'An audiobook membership sent a “sorry to see you go” email in July, then billed three more times.', impact: '$179/yr' },
  { handle: '@billed-twice', body: 'The same cloud-storage plan on two cards — two Apple IDs, one family, double the bill.', impact: '$36/yr' },
  { handle: '@promo-ended', body: 'A $4 news subscription quietly became $25 after its first year.', impact: '$252/yr' },
]

/** Example detections from the demo ledger, summarised in plain words. */
export function CaughtCards() {
  return (
    <section className="py-20">
      <div className="gutter">
        <SectionTitle>Caught in the wild</SectionTitle>
        <p className="mt-4 max-w-lg text-dim">Four patterns the leak engine flags in the demo ledger, in plain words. Open the demo to see the full detail behind each.</p>
      </div>
      <div className="gutter mt-10 flex snap-x gap-[10px] overflow-x-auto pb-4">
        {CAUGHT.map((c, i) => (
          <Reveal key={c.handle} delay={i * 0.06} className="w-[82vw] shrink-0 snap-start sm:w-[420px]">
            <Panel className="flex h-[280px] flex-col p-5">
              <p className="text-[15px] font-semibold tracking-[-0.02em]">{c.handle}</p>
              <p className="mt-5 max-w-[42ch] text-[13.5px] leading-relaxed">{c.body}</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="text-[15px] font-semibold text-leak-ink">{c.impact}</span>
                <Link href="/login" data-track="caught-cards" className="type-label inline-flex items-center gap-1 hover:underline">
                  See it in the demo <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </Panel>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const SECURITY: { group: string; rows: [string, string][] }[] = [
  {
    group: 'Bank',
    rows: [
      ['Read-only access through Plaid — we can’t move money', 'Always'],
      ['Your bank login never touches our servers', 'Plaid'],
      ['Disconnect any time; imported data is deleted', 'One click'],
    ],
  },
  {
    group: 'Storage',
    rows: [
      ['Bank and mailbox tokens sealed with AES-256-GCM', 'Encrypted'],
      ['Row-level security on every table', 'Postgres'],
      ['Never sold, rented or shared', 'Ever'],
    ],
  },
  {
    group: 'Inbox',
    rows: [
      ['Message metadata and preview snippets only', 'Optional'],
      ['We never send mail as you', 'Never'],
    ],
  },
]

/** Editorial two-column list: group label left, rows right with a right-aligned value. */
export function SecurityList() {
  return (
    <section className="gutter py-24">
      <SectionTitle>How we keep it safe</SectionTitle>
      <div className="mt-12 space-y-10">
        {SECURITY.map((g) => (
          <Reveal key={g.group} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_2fr]">
            <p className="text-[17px] tracking-[-0.02em]">{g.group}</p>
            <ul>
              {g.rows.map(([label, value]) => (
                <li key={label} className="flex items-baseline justify-between gap-6 py-1 text-[17px] tracking-[-0.02em] sm:text-[19px]">
                  <span>{label}</span>
                  <span className="shrink-0 text-dim">{value}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
