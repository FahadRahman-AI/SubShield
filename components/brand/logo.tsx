import Link from 'next/link'
import { cn } from '@/lib/utils'

/** Lowercase wordmark; the "cut" is a small coral slash through the final stroke. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-baseline text-[21px] leading-none font-semibold tracking-[-0.05em]', className)}>
      subshield
      <span aria-hidden className="ml-[2px] inline-block h-[0.42em] w-[0.42em] bg-coral" />
    </span>
  )
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center', className)} aria-label="SubShield home">
      <Wordmark />
    </Link>
  )
}
