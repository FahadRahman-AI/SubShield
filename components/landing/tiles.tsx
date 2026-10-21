import { BellRing, Copy, Scissors, ShieldCheck, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Pastel "object" tiles — small illustrated still-lifes of each kind of leak.
// They stand in for product photography: flat colour, one object, a caption.

export function Tile({ tone, label, children, className }: { tone: string; label?: string; children: ReactNode; className?: string }) {
  return (
    <figure className={cn('relative flex flex-col overflow-hidden', tone, className)}>
      <div className="grid flex-1 place-items-center p-4">{children}</div>
      {label ? <figcaption className="type-label px-3 pb-3">{label}</figcaption> : null}
    </figure>
  )
}

export function ReceiptObject() {
  return (
    <div className="w-[62%] -rotate-6 bg-white px-3 pt-3 pb-4 shadow-[0_18px_30px_-18px_rgb(60_60_60/0.5)] [clip-path:polygon(0_0,100%_0,100%_92%,90%_100%,80%_92%,70%_100%,60%_92%,50%_100%,40%_92%,30%_100%,20%_92%,10%_100%,0_92%)]">
      <span className="block h-1 w-1/2 bg-panel-2" />
      <span className="mt-1.5 block h-1 w-3/4 bg-panel-2" />
      <span className="mt-1.5 block h-1 w-2/3 bg-panel-2" />
      <span className="mt-3 flex items-center justify-between text-[12px] font-semibold">
        $17.99 <TrendingUp className="size-3.5 text-leak" />
      </span>
    </div>
  )
}

export function ScissorsObject() {
  return (
    <div className="relative grid w-full place-items-center">
      <span className="absolute inset-x-2 top-1/2 border-t-2 border-dashed border-ink/50" />
      <Scissors className="relative size-14 -rotate-12 bg-coral p-1" strokeWidth={1.25} />
    </div>
  )
}

export function TagObject({ text = '+16%' }: { text?: string }) {
  return (
    <div className="relative rotate-6 bg-white py-3 pr-4 pl-7 text-[18px] font-semibold tracking-[-0.03em] shadow-[0_18px_30px_-18px_rgb(60_60_60/0.5)] [clip-path:polygon(18%_0,100%_0,100%_100%,18%_100%,0_50%)]">
      <span className="absolute top-1/2 left-[14%] size-2 -translate-y-1/2 rounded-full bg-butter" />
      {text}
    </div>
  )
}

export function CalendarObject() {
  return (
    <div className="w-[64%] bg-white text-center shadow-[0_18px_30px_-18px_rgb(60_60_60/0.5)]">
      <span className="block bg-ink py-1 text-[9px] text-white">RENEWS</span>
      <span className="block py-2 text-[34px] leading-none font-semibold tracking-[-0.05em]">23</span>
      <span className="block pb-2 text-[9px] text-dim">in 3 days</span>
    </div>
  )
}

export function DuplicateObject() {
  return (
    <div className="relative h-[46%] w-[62%]">
      <span className="absolute inset-0 translate-x-3 -translate-y-3 bg-white/60" />
      <span className="absolute inset-0 grid place-items-center bg-white shadow-[0_18px_30px_-18px_rgb(60_60_60/0.5)]">
        <Copy className="size-6" strokeWidth={1.25} />
      </span>
      <span className="absolute -right-2 -bottom-2 rounded-full bg-ink px-2 py-0.5 text-[10px] text-white">×2</span>
    </div>
  )
}

export function ShieldObject() {
  return <ShieldCheck className="size-16" strokeWidth={1.1} />
}

export function BellObject() {
  return (
    <div className="relative">
      <BellRing className="size-14" strokeWidth={1.1} />
      <span className="absolute top-0 right-0 size-3 rounded-full bg-coral" />
    </div>
  )
}
