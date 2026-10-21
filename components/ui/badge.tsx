import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// Pills are the one rounded shape in the system — small, flat, accent-filled.
const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] leading-tight font-medium whitespace-nowrap text-ink [&_svg]:size-3', {
  variants: {
    tone: {
      neutral: 'bg-white',
      leak: 'bg-coral',
      save: 'bg-lime',
      insight: 'bg-lavender',
      warn: 'bg-mustard',
      dark: 'bg-ink text-white',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({ className, tone, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
