import { Label as L, Switch as S } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const field =
  'w-full bg-white text-[14px] text-ink placeholder:text-faint outline-none transition-shadow focus:shadow-[inset_0_0_0_1px_var(--color-ink)] disabled:opacity-50'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(field, 'h-12 px-4', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(field, 'p-4 font-mono text-[13px] leading-relaxed', className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        field,
        'h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20fill%3D%27none%27%20stroke%3D%27%233c3c3c%27%20stroke-width%3D%271.5%27%3E%3Cpath%20d%3D%27m4%206%204%204%204-4%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_16px_center] bg-no-repeat px-4 pr-10',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: ComponentProps<typeof L.Root>) {
  return <L.Root className={cn('type-label text-dim', className)} {...props} />
}

export function Switch({ className, ...props }: ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-panel-2 transition-colors data-[state=checked]:bg-ink disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white transition-transform duration-300 ease-[var(--ease-cascade)] data-[state=checked]:translate-x-[22px]" />
    </S.Root>
  )
}

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('animate-pulse bg-panel', className)} {...props} />
}
