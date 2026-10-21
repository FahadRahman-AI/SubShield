import { Bell, Check, Home, ListChecks, Lock, Scissors } from 'lucide-react'
import type { ReactNode } from 'react'
import { Wordmark } from '@/components/brand/logo'
import { MerchantIcon } from '@/components/brand/merchant-icon'
import { cn } from '@/lib/utils'

// SubShield mobile app — marketing mockups. Everything is drawn in CSS at a
// fixed 300px device width; scale the wrapper (className) to resize.

function StatusBar({ tone = 'ink' }: { tone?: 'ink' | 'white' }) {
  const color = tone === 'white' ? 'text-white' : 'text-ink'
  return (
    <div className={cn('relative z-10 flex h-11 items-end justify-between px-7 pb-1 text-[12px] font-semibold', color)}>
      <span className="tabular">9:41</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <svg viewBox="0 0 18 12" className="h-[10px] w-[16px] fill-current">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <svg viewBox="0 0 16 12" className="h-[10px] w-[14px] fill-current">
          <path d="M8 2.4c2.2 0 4.2.9 5.7 2.3l1.1-1.2A9.6 9.6 0 0 0 8 .8 9.6 9.6 0 0 0 1.2 3.5l1.1 1.2A8 8 0 0 1 8 2.4Zm0 3.3c1.3 0 2.5.5 3.4 1.3l1.1-1.2A6.5 6.5 0 0 0 8 4.1 6.5 6.5 0 0 0 3.5 5.8l1.1 1.2A5 5 0 0 1 8 5.7Zm0 3.2c.5 0 .9.2 1.2.5L8 10.7 6.8 9.4c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <span className="relative h-[11px] w-[22px] rounded-[3px] border border-current p-[1.5px]">
          <span className="block h-full w-[70%] rounded-[1.5px] bg-current" />
        </span>
      </span>
    </div>
  )
}

/**
 * The device is exposed to assistive tech as a single labelled image; the mock
 * UI inside is decorative, so its fake text and "buttons" aren't read out.
 */
export function PhoneFrame({ children, label, className, screenClassName }: { children: ReactNode; label: string; className?: string; screenClassName?: string }) {
  return (
    <div role="img" aria-label={label} className={cn('relative w-[300px] shrink-0', className)}>
      {/* side buttons */}
      <span aria-hidden className="absolute top-[118px] -left-[3px] h-[30px] w-[3px] rounded-l bg-[#2b2b2d]" />
      <span aria-hidden className="absolute top-[162px] -left-[3px] h-[54px] w-[3px] rounded-l bg-[#2b2b2d]" />
      <span aria-hidden className="absolute top-[228px] -left-[3px] h-[54px] w-[3px] rounded-l bg-[#2b2b2d]" />
      <span aria-hidden className="absolute top-[180px] -right-[3px] h-[86px] w-[3px] rounded-r bg-[#2b2b2d]" />
      <div className="relative aspect-[300/620] rounded-[52px] bg-[#1c1c1e] p-[9px] shadow-[inset_0_0_0_1.5px_#48484a,0_50px_80px_-40px_rgb(60_60_60/0.55)]">
        <div aria-hidden className={cn('relative h-full overflow-hidden rounded-[43px] bg-page', screenClassName)}>
          <span aria-hidden className="absolute top-[11px] left-1/2 z-20 h-[27px] w-[90px] -translate-x-1/2 rounded-full bg-black" />
          {children}
          <span aria-hidden className="absolute bottom-[7px] left-1/2 z-20 h-[4px] w-[108px] -translate-x-1/2 rounded-full bg-ink/80" />
        </div>
      </div>
    </div>
  )
}

const LEAKS = [
  { key: 'nytimes', name: 'The New York Times', reason: 'Promo ended · $4 → $25', amount: 252, tile: 'bg-butter' },
  { key: 'perplexity', name: 'Perplexity Pro', reason: 'Overlaps ChatGPT Plus', amount: 240, tile: 'bg-lavender' },
  { key: 'netflix', name: 'Netflix', reason: 'Price up 16%', amount: 216, tile: 'bg-blush' },
  { key: 'planet-fitness', name: 'Planet Fitness', reason: 'Likely unused', amount: 204, tile: 'bg-olive' },
  { key: 'audible', name: 'Audible', reason: 'Charged after cancelling', amount: 179, tile: 'bg-sky' },
]

function TabBar({ active }: { active: 0 | 1 | 2 | 3 }) {
  const tabs = [
    { icon: Home, label: 'Report' },
    { icon: ListChecks, label: 'Subs' },
    { icon: Scissors, label: 'Cancel' },
    { icon: Bell, label: 'Alerts' },
  ]
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-4 bg-white px-3 pt-2 pb-6">
      {tabs.map((t, i) => (
        <span key={t.label} className={cn('flex flex-col items-center gap-1 text-[9px]', i === active ? 'text-ink' : 'text-faint')}>
          <t.icon className="size-[17px]" strokeWidth={1.75} />
          {t.label}
        </span>
      ))}
    </div>
  )
}

/** Home tab: the leak report. */
export function LeakReportScreen() {
  return (
    <>
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-3">
        <Wordmark className="text-[15px]" />
        <span className="grid size-7 place-items-center rounded-full bg-sand text-[10px] font-semibold">AM</span>
      </div>
      <div className="px-5 pt-5">
        <p className="text-[10px] text-dim">Yearly waste detected</p>
        <p className="mt-1 flex items-baseline gap-1.5 text-[44px] leading-none font-semibold tracking-[-0.05em]">
          $1,850<span className="text-[14px] font-normal tracking-normal text-dim">/yr</span>
        </p>
        <div className="mt-3 flex h-[6px] bg-panel-2">
          <span className="h-full w-[39%] bg-leak" />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-dim">
          <span>39% of recurring spend</span>
          <span className="rounded-full bg-coral px-1.5 text-ink">14 leaks</span>
        </div>
      </div>
      <p className="px-5 pt-5 pb-2 text-[11px] font-semibold tracking-[-0.01em]">Biggest leaks</p>
      <ul className="space-y-[3px] px-3">
        {LEAKS.map((l) => (
          <li key={l.name} className="flex items-center gap-2.5 bg-panel px-2.5 py-2">
            <MerchantIcon merchantKey={l.key} name={l.name} fallbackTone={l.tile} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-medium">{l.name}</span>
              <span className="block truncate text-[9px] text-dim">{l.reason}</span>
            </span>
            <span className="tabular text-[11px] font-semibold text-leak-ink">${l.amount}</span>
          </li>
        ))}
      </ul>
      <div className="px-3 pt-3">
        <div className="bg-ink py-2.5 text-center text-[11px] text-white">Cancel with Copilot</div>
      </div>
      <TabBar active={0} />
    </>
  )
}

/** Lock screen with a renewal warning and a price-hike alert. */
export function RenewalAlertScreen() {
  return (
    <div className="absolute inset-0 bg-sand">
      {/* flat pastel wallpaper blocks */}
      <div aria-hidden className="absolute inset-0 grid grid-cols-2 grid-rows-3">
        <span className="bg-sand" />
        <span className="bg-lavender" />
        <span className="bg-butter" />
        <span className="bg-sand" />
        <span className="bg-panel-2" />
        <span className="bg-olive" />
      </div>
      <div className="relative">
        <StatusBar />
        <div className="flex flex-col items-center pt-4 text-ink">
          <Lock className="size-3.5" />
          <p className="mt-2 text-[11px] font-medium">Tuesday, 20 October</p>
          <p className="text-[64px] leading-none font-semibold tracking-[-0.04em]">9:41</p>
        </div>
        <div className="mt-8 space-y-1.5 px-3">
          {[
            { title: 'Headspace renews in 3 days', body: '$69.99 annual · Tap to cancel before it charges', when: 'now' },
            { title: 'Price hike: Adobe Creative Cloud', body: '$54.99 → $59.99/mo. That’s +$60 a year.', when: '2h ago' },
            { title: 'New subscription detected', body: 'SiriusXM — a $1 trial converted to $10.99/mo', when: 'Yesterday' },
          ].map((n, i) => (
            <div key={n.title} className={cn('bg-white/95 p-3 shadow-[0_8px_24px_-12px_rgb(60_60_60/0.4)]', i > 0 && 'opacity-90')}>
              <p className="flex items-center justify-between text-[9px] text-dim">
                <span className="flex items-center gap-1.5">
                  <span className="grid size-4 place-items-center bg-ink">
                    <span className="size-1.5 bg-coral" />
                  </span>
                  SUBSHIELD
                </span>
                {n.when}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold">{n.title}</p>
              <p className="text-[10px] text-dim">{n.body}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-9 flex justify-between px-10">
        {[0, 1].map((i) => (
          <span key={i} className="size-10 rounded-full bg-white/60" aria-hidden />
        ))}
      </div>
    </div>
  )
}

/** Cancel tab: a cancellation in flight. */
export function CancelScreen() {
  return (
    <>
      <StatusBar />
      <div className="px-5 pt-4">
        <p className="text-[10px] text-dim">Cancel Copilot</p>
        <p className="mt-1 text-[26px] leading-[1] font-semibold tracking-[-0.04em]">Cancel Audible</p>
        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-dim">
          <span className="flex gap-0.5">
            <span className="h-1 w-3 bg-mustard" />
            <span className="h-1 w-3 bg-mustard" />
            <span className="h-1 w-3 bg-panel-2" />
          </span>
          Medium friction · $14.95/mo
        </div>
      </div>
      <div className="mx-3 mt-4 bg-lime p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold">
          <Check className="size-3.5" /> Request sent
        </p>
        <p className="mt-1 text-[9.5px]">Emailed to support with you in CC. Replies come straight to you.</p>
      </div>
      <ol className="mt-3 space-y-[3px] px-3">
        {[
          { t: 'Letter generated (US rules)', done: true },
          { t: 'Sent to vendor support', done: true },
          { t: 'Vendor confirms', done: false },
          { t: 'No charge on Nov 8', done: false },
        ].map((s, i) => (
          <li key={s.t} className="flex items-center gap-2.5 bg-panel px-3 py-2.5 text-[10.5px]">
            <span className={cn('grid size-4 place-items-center rounded-full text-[8px]', s.done ? 'bg-ink text-white' : 'bg-white text-dim')}>{s.done ? <Check className="size-2.5" /> : i + 1}</span>
            <span className={s.done ? '' : 'text-dim'}>{s.t}</span>
          </li>
        ))}
      </ol>
      <div className="mx-3 mt-3 flex items-baseline justify-between bg-white px-3 py-3">
        <span className="text-[10px] text-dim">You’ll save</span>
        <span className="text-[20px] font-semibold tracking-[-0.04em]">$179.40/yr</span>
      </div>
      <TabBar active={2} />
    </>
  )
}
