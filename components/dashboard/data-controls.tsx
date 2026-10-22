'use client'

import { Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/form'
import { Bullet, Panel } from '@/components/ui/panel'
import { deleteAccount } from '@/lib/actions/account'
import { DELETE_CONFIRMATION } from '@/lib/legal'

/** "Your data": download a copy (right of access) and delete everything (right to erasure). */
export function DataControls({ isPro }: { isPro: boolean }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [pending, startTransition] = useTransition()

  const remove = () =>
    startTransition(async () => {
      // On success the action redirects away, so a result only comes back on failure.
      const res = await deleteAccount({ confirm })
      if (!res.ok) toast.error(res.error)
    })

  return (
    <Panel className="mt-[10px] p-5 sm:p-6">
      <Bullet>Your data</Bullet>
      <p className="type-label mt-1 pl-4 text-dim">
        Download everything we hold about you, or delete it all. See our{' '}
        <Link href="/legal/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-5 flex flex-wrap gap-px">
        <Button asChild variant="secondary">
          {/* A file download from a route handler needs a plain link, not client navigation. */}
          <a href="/api/account/export" download>
            <Download /> Download my data
          </a>
        </Button>
        <Button variant="ghost" onClick={() => setOpen(true)} className="text-leak-ink">
          Delete my account
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setConfirm('')
        }}
      >
        <DialogContent title="Delete your account?" description="This can’t be undone.">
          <ul className="mt-5 space-y-1.5 text-[14px]">
            {isPro ? <li>— Your Pro subscription is cancelled immediately and you won’t be charged again.</li> : null}
            <li>— Your banks and mailboxes are disconnected.</li>
            <li>— Your transactions, detected subscriptions, alerts and cancellation history are erased.</li>
            <li>— Payment records Stripe must keep for tax law are not affected.</li>
          </ul>
          <div className="mt-6 space-y-2">
            <Label htmlFor="confirm-delete">Type {DELETE_CONFIRMATION} to confirm</Label>
            <Input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="bg-white" />
          </div>
          <Button className="mt-6 w-full bg-leak-ink hover:bg-[#8f2e26]" disabled={confirm !== DELETE_CONFIRMATION || pending} onClick={remove}>
            {pending ? <Loader2 className="animate-spin" /> : null} Permanently delete my account
          </Button>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}
