import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(value: number, opts: { cents?: boolean; currency?: string } = {}) {
  const cents = opts.cents ?? !Number.isInteger(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: opts.currency ?? 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(value)
}

export const CYCLE_LABEL = { weekly: '/wk', monthly: '/mo', yearly: '/yr' } as const
