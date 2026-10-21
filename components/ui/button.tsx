import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'group/btn relative inline-flex items-center justify-center whitespace-nowrap font-normal select-none transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-white hover:bg-[#2a2a2a]',
        secondary: 'bg-white text-ink hover:bg-panel-2',
        accent: 'bg-coral text-ink hover:bg-[#f47148]',
        ghost: 'text-ink hover:bg-panel-2/70',
      },
      size: {
        sm: 'h-10 px-4 text-[13.5px]',
        md: 'h-12 px-6 text-[13.5px]',
        lg: 'h-14 px-8 text-[15px]',
        icon: 'size-12',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

/**
 * The label "cascades" on hover: it rolls up out of view while an identical
 * copy rolls in from below. The copy is aria-hidden.
 */
export function Cascade({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex overflow-hidden">
      <span className="inline-flex items-center gap-2 transition-transform duration-500 ease-[var(--ease-cascade)] group-hover/btn:-translate-y-[115%]">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 inline-flex translate-y-[115%] items-center justify-center gap-2 transition-transform duration-500 ease-[var(--ease-cascade)] group-hover/btn:translate-y-0"
      >
        {children}
      </span>
    </span>
  )
}

export function Button({
  className,
  variant,
  size,
  asChild,
  cascade = true,
  children,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean; cascade?: boolean }) {
  const classes = cn(buttonVariants({ variant, size }), className)
  const wrap = (content: ReactNode) => (cascade ? <Cascade>{content}</Cascade> : <span className="inline-flex items-center gap-2">{content}</span>)

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ children?: ReactNode }>
    return (
      <Slot.Root className={classes} {...props}>
        {cloneElement(child, undefined, wrap(child.props.children))}
      </Slot.Root>
    )
  }
  return (
    <button className={classes} {...props}>
      {wrap(children)}
    </button>
  )
}
