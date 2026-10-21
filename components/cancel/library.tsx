'use client'

import { ArrowUpRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/form'
import { Bullet, Panel } from '@/components/ui/panel'
import { MERCHANTS, PHONE_SCRIPT, type CancelChannel, type Difficulty, type Merchant } from '@/lib/catalog/merchants'
import { cn } from '@/lib/utils'

export const CHANNEL_LABEL: Record<CancelChannel, string> = {
  online: 'Online',
  app_store: 'App store',
  phone: 'Phone',
  chat: 'Chat required',
  mail: 'Mail / in person',
  in_person: 'In person',
}

const LEVEL: Record<Difficulty, { n: number; label: string; bar: string }> = {
  easy: { n: 1, label: 'Easy', bar: 'bg-save' },
  medium: { n: 2, label: 'Medium', bar: 'bg-mustard' },
  nightmare: { n: 3, label: 'Nightmare', bar: 'bg-leak' },
}

export function FrictionMeter({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  const l = LEVEL[difficulty]
  return (
    <span className={cn('type-label flex items-center gap-2', className)} aria-label={`Cancellation difficulty: ${l.label}`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((k) => (
          <span key={k} className={cn('h-1.5 w-4', k <= l.n ? l.bar : 'bg-panel-2')} />
        ))}
      </span>
      {l.label}
    </span>
  )
}

export function GuideBody({ merchant }: { merchant: Pick<Merchant, 'name' | 'cancel'> }) {
  const g = merchant.cancel
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <FrictionMeter difficulty={g.difficulty} />
        <Badge>{CHANNEL_LABEL[g.channel]}</Badge>
      </div>
      <ol className="space-y-[3px]">
        {g.steps.map((s, i) => (
          <li key={i} className="flex gap-3 bg-white p-3 text-[14px] leading-relaxed">
            <span className="tabular w-5 shrink-0 text-dim">0{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {g.darkPatterns.length ? (
        <div className="bg-coral/70 p-4">
          <p className="text-[14px] font-semibold">Dark patterns to expect</p>
          <ul className="mt-2 space-y-1 text-[14px]">
            {g.darkPatterns.map((d) => (
              <li key={d}>— {d}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {g.tip ? <p className="bg-lime p-4 text-[14px]">Tip: {g.tip}</p> : null}
      {g.url ? (
        <Button asChild variant="secondary" size="sm">
          <a href={g.url} target="_blank" rel="noreferrer noopener">
            Open {merchant.name} account page <ArrowUpRight />
          </a>
        </Button>
      ) : null}
    </div>
  )
}

export function PhoneScript() {
  return (
    <Panel tone="sand" className="p-5 sm:p-6">
      <Bullet>Retention-call cheat sheet</Bullet>
      <ol className="mt-5 space-y-[3px]">
        {PHONE_SCRIPT.map((line, i) => (
          <li key={i} className="flex gap-3 bg-page p-3 text-[14px] leading-relaxed">
            <span className="tabular w-5 shrink-0 text-dim">0{i + 1}</span>
            {line}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

export function DarkPatternLibrary() {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<Difficulty | 'all'>('all')
  const [open, setOpen] = useState<Merchant | null>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const order = { nightmare: 0, medium: 1, easy: 2 }
    return MERCHANTS.filter((m) => (level === 'all' || m.cancel.difficulty === level) && (!q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))).sort(
      (a, b) => order[a.cancel.difficulty] - order[b.cancel.difficulty] || a.name.localeCompare(b.name),
    )
  }, [query, level])

  return (
    <section aria-labelledby="library-heading">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="library-heading" className="type-display">
            Dark-pattern library
          </h2>
          <p className="mt-3 text-dim">{MERCHANTS.length} services rated by how hard they make it to leave. Free for everyone.</p>
        </div>
        <div className="flex w-full flex-wrap gap-px sm:w-auto">
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-dim" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services" className="h-10 pl-10" aria-label="Search services" />
          </div>
          {(['all', 'nightmare', 'medium', 'easy'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={cn('h-10 px-3.5 text-[13px] capitalize transition-colors', level === l ? 'bg-ink text-white' : 'bg-white hover:bg-panel-2')}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-[10px] sm:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => (
          <li key={m.key}>
            <button onClick={() => setOpen(m)} className="flex h-full min-h-[150px] w-full flex-col bg-panel p-4 text-left transition-colors hover:bg-panel-2">
              <span className="flex w-full items-start justify-between gap-3">
                <span className="text-[17px] font-semibold tracking-[-0.03em]">{m.name}</span>
                <FrictionMeter difficulty={m.cancel.difficulty} />
              </span>
              <span className="type-label mt-1 text-dim">
                {m.category} · {CHANNEL_LABEL[m.cancel.channel]}
              </span>
              <span className="type-label mt-auto pt-4">{m.cancel.darkPatterns[0] ? `⚠ ${m.cancel.darkPatterns[0]}` : 'No known dark patterns'}</span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open ? (
          <DialogContent title={`Cancel ${open.name}`} description={`${open.category} · ${CHANNEL_LABEL[open.cancel.channel]}`}>
            <div className="mt-6">
              <GuideBody merchant={open} />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  )
}
