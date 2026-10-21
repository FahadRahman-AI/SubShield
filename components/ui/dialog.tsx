'use client'

import { X } from 'lucide-react'
import { Dialog as D } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: ComponentProps<typeof D.Content> & { title: string; description?: ReactNode }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-page p-6 outline-none data-[state=open]:animate-dialog-in sm:p-8',
          className,
        )}
        {...props}
      >
        <D.Title className="type-title pr-10">{title}</D.Title>
        <D.Description className={cn('mt-2 text-sm text-dim', !description && 'sr-only')}>{description ?? title}</D.Description>
        {children}
        <D.Close className="absolute top-0 right-0 grid size-12 place-items-center bg-white text-ink transition-colors hover:bg-panel-2" aria-label="Close">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  )
}
