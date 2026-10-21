'use client'

import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { createContext, use, useState, useTransition, type ComponentProps, type ReactNode } from 'react'
import { toast } from 'sonner'
import { BillingToggle } from '@/components/landing/pricing'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { startCheckout } from '@/lib/actions/billing'
import { PRICING, PRO_FEATURES } from '@/lib/pricing'
import { formatMoney } from '@/lib/utils'
import { track } from '@/lib/analytics'

interface UpgradeContextValue {
  open: (reason?: string) => void
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null)

export function useUpgrade() {
  const ctx = use(UpgradeContext)
  if (!ctx) throw new Error('useUpgrade must be used inside <UpgradeProvider>')
  return ctx
}

/** One paywall dialog per page; any component can open it with a reason. */
export function UpgradeProvider({ children, yearlyWaste, leakCount }: { children: ReactNode; yearlyWaste: number; leakCount: number }) {
  const [isOpen, setOpen] = useState(false)
  const [reason, setReason] = useState<string | undefined>()
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const [pending, startTransition] = useTransition()
  const price = PRICING[period]
  const multiple = yearlyWaste > 0 ? Math.floor(yearlyWaste / PRICING.yearly.amount) : 0

  const checkout = () =>
    startTransition(async () => {
      track('checkout_started', { plan: period })
      const res = await startCheckout(period)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      if (res.url) {
        window.location.href = res.url
        return
      }
      setOpen(false)
      track('pro_unlocked', { via: 'demo' })
      toast.success('Pro unlocked', { description: 'Demo mode: checkout simulated. Every leak is now revealed.' })
    })

  return (
    <UpgradeContext
      value={{
        open: (r) => {
          setReason(r)
          setOpen(true)
          track('paywall_opened')
        },
      }}
    >
      {children}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent title="Unlock every leak" description={reason ?? 'See every leak, cancel in one click, and keep new ones from sneaking in.'} className="max-w-xl">
          {yearlyWaste > 0 ? (
            <p className="mt-6 bg-coral px-4 py-3 text-[14px]">
              <span className="font-semibold">{formatMoney(Math.round(yearlyWaste))}/yr</span> is leaking across {leakCount} subscriptions.
              {multiple >= 2 ? ` That’s ${multiple}× the cost of Pro.` : null}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6 bg-panel p-5">
            <div>
              <p className="type-label text-dim">SubShield Pro</p>
              <p className="type-display mt-1">
                {price.label}
                <span className="text-[15px] font-normal tracking-normal text-dim">{price.per}</span>
              </p>
            </div>
            <BillingToggle value={period} onChange={setPeriod} />
          </div>

          <ul className="mt-5 grid grid-cols-1 gap-2 text-[13.5px] sm:grid-cols-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0" /> {f}
              </li>
            ))}
          </ul>

          <Button size="lg" className="mt-7 w-full" onClick={checkout} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? 'Opening secure checkout…' : `Unlock Pro — ${price.label}${price.per}`}
          </Button>
          <p className="type-label mt-3 flex items-center justify-center gap-1.5 text-dim">
            <ShieldCheck className="size-3.5" /> Secure checkout by Stripe · cancel in one click, no retention flow
          </p>
        </DialogContent>
      </Dialog>
    </UpgradeContext>
  )
}

export function UpgradeButton({ reason, children, ...props }: { reason?: string; children: ReactNode } & Omit<ComponentProps<typeof Button>, 'onClick'>) {
  const { open } = useUpgrade()
  return (
    <Button {...props} onClick={() => open(reason)}>
      {children}
    </Button>
  )
}
