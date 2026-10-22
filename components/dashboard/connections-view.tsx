'use client'

import { AlertTriangle, Building2, Inbox, Loader2, Mail } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bullet, Panel } from '@/components/ui/panel'
import { disconnect } from '@/lib/actions/connections'
import type { ConnectionView } from '@/lib/data/types'
import { BankRegionNotice, ConnectBankButton, ConnectMailboxButtons } from './connect-flow'

const ERRORS: Record<string, string> = {
  'google-not-configured': 'Gmail scanning isn’t configured (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).',
  'microsoft-not-configured': 'Outlook scanning isn’t configured (missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET).',
  'oauth-state': 'That sign-in link expired or was tampered with. Please try again.',
  'oauth-exchange': 'We couldn’t finish connecting your mailbox. Please try again.',
}

function ConnectionRow({ c }: { c: ConnectionView }) {
  const [pending, startTransition] = useTransition()
  const Icon = c.provider === 'plaid' ? Building2 : c.provider === 'google' ? Mail : Inbox
  return (
    <li className="flex items-center gap-4 bg-white p-3 sm:p-4">
      <span className="grid size-10 place-items-center bg-panel">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px]">{c.label}</span>
          {c.status === 'error' ? (
            <Badge tone="leak">
              <AlertTriangle /> Needs attention
            </Badge>
          ) : (
            <Badge tone="save">Active</Badge>
          )}
        </span>
        <span className="type-label block truncate text-dim">
          {c.detail} {c.lastSyncedAt ? `· synced ${new Date(c.lastSyncedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
        </span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Disconnect ${c.label}? Its imported data will be deleted.`)) return
          startTransition(async () => {
            const res = await disconnect(c.id)
            if (res.ok) toast.success(`${c.label} disconnected`)
            else toast.error(res.error)
          })
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : null} Disconnect
      </Button>
    </li>
  )
}

export function ConnectionsView({ connections, demo, regionRestricted = false }: { connections: ConnectionView[]; demo: boolean; regionRestricted?: boolean }) {
  const params = useSearchParams()
  const shown = useRef(false)
  useEffect(() => {
    if (shown.current) return
    const error = params.get('error')
    const connected = params.get('connected')
    if (error) toast.error(ERRORS[error] ?? 'Something went wrong.')
    if (connected) toast.success(`${connected === 'google' ? 'Gmail' : 'Outlook'} connected`, { description: 'Scanning your receipts in the background.' })
    shown.current = Boolean(error || connected)
  }, [params])

  const banks = connections.filter((c) => c.provider === 'plaid')
  const mail = connections.filter((c) => c.provider !== 'plaid')

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="type-display">Connections</h1>
      <p className="mt-3 text-dim">Read-only access. Disconnecting revokes the token and deletes the imported data.</p>

      <Panel className="mt-10 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Bullet>Banks & cards</Bullet>
            <p className="type-label mt-1 pl-4 text-dim">Via Plaid · new charges stream in automatically</p>
          </div>
          <ConnectBankButton demo={demo} label={banks.length ? 'Add another account' : 'Connect bank or card'} size="md" />
        </div>
        {regionRestricted ? (
          <div className="mt-5">
            <BankRegionNotice />
          </div>
        ) : null}
        <ul className="mt-5 space-y-[3px]">
          {banks.map((c) => (
            <ConnectionRow key={c.id} c={c} />
          ))}
          {banks.length === 0 ? <li className="text-[14px] text-dim">No banks connected yet.</li> : null}
        </ul>
      </Panel>

      <Panel tone="sand" className="mt-[10px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Bullet>Inbox</Bullet>
            <p className="type-label mt-1 pl-4">Receipts, price-change notices and cancellation confirmations</p>
          </div>
          <ConnectMailboxButtons demo={demo} connected={mail.length > 0} />
        </div>
        <ul className="mt-5 space-y-[3px]">
          {mail.map((c) => (
            <ConnectionRow key={c.id} c={c} />
          ))}
          {mail.length === 0 ? <li className="text-[14px]">No mailbox connected. We only read message metadata and preview snippets.</li> : null}
        </ul>
      </Panel>
    </div>
  )
}
