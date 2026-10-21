import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const TONES = {
  page: 'bg-page',
  panel: 'bg-panel',
  panel2: 'bg-panel-2',
  sand: 'bg-sand',
  white: 'bg-white',
} as const

export type PanelTone = keyof typeof TONES

/** A flat, square-cornered surface — the basic building block of every layout. */
export function Panel({ tone = 'panel', className, ...props }: ComponentProps<'div'> & { tone?: PanelTone }) {
  return <div className={cn(TONES[tone], className)} {...props} />
}

/** "• Title" — the bulleted heading style used on panels. */
export function Bullet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-center gap-2.5 text-[15px]', className)}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink" />
      {children}
    </p>
  )
}
