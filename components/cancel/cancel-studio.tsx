'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Copy, Download, Loader2, Lock, Printer, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Monogram } from '@/components/dashboard/leak-list'
import { UpgradeButton } from '@/components/dashboard/upgrade'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/form'
import { Bullet, Panel } from '@/components/ui/panel'
import { sendCancellation, setSubscriptionStatus } from '@/lib/actions/subscriptions'
import { buildCancellationLetter } from '@/lib/cancellation/letters'
import type { CancelGuide } from '@/lib/catalog/merchants'
import { formatShortDate } from '@/lib/dates'
import { REGIONS, type Region, type SubscriptionView } from '@/lib/data/types'
import { cn, formatMoney } from '@/lib/utils'
import { FrictionMeter, GuideBody } from './library'
import { track } from '@/lib/analytics'

type Method = 'email' | 'letter'

export function CancelStudio({
  sub,
  guide,
  user,
  isPro,
  demo,
  today,
  sentAt,
}: {
  sub: SubscriptionView
  guide: CancelGuide
  user: { name: string; email: string; region: Region }
  isPro: boolean
  demo: boolean
  today: string
  sentAt: string | null
}) {
  const [method, setMethod] = useState<Method>(guide.channel === 'mail' ? 'letter' : 'email')
  const [region, setRegion] = useState<Region>(user.region)
  const [recipient, setRecipient] = useState('')
  const template = useMemo(() => buildCancellationLetter({ sub, user, region, method, today }), [sub, user, region, method, today])
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const [edited, setEdited] = useState(false)
  const [sent, setSent] = useState<string | null>(sentAt)
  const [pending, startTransition] = useTransition()

  // Keep the draft in sync with region / method until the user edits it.
  const [lastTemplate, setLastTemplate] = useState(template)
  if (template !== lastTemplate) {
    setLastTemplate(template)
    if (!edited) {
      setSubject(template.subject)
      setBody(template.body)
    }
  }

  const reset = () => {
    setSubject(template.subject)
    setBody(template.body)
    setEdited(false)
  }

  const send = () =>
    startTransition(async () => {
      const res = await sendCancellation({ id: sub.id, method, recipient: method === 'email' ? recipient : undefined, subject, body, region })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setSent(new Date().toISOString())
      track('cancellation_sent', { method, merchant: sub.merchantKey })
      toast.success(method === 'email' ? 'Cancellation sent' : 'Letter logged', { description: res.message })
    })

  const markCancelled = () =>
    startTransition(async () => {
      const res = await setSubscriptionStatus({ id: sub.id, status: 'cancelled' })
      if (res.ok) toast.success(`${sub.name} cancelled`, { description: `You’re saving ${formatMoney(Math.round(sub.yearlyCost))} a year.` })
      else toast.error(res.error)
    })

  const fullText = method === 'email' ? `Subject: ${subject}\n\n${body}` : body

  const copy = async () => {
    await navigator.clipboard.writeText(fullText)
    toast.success('Copied to clipboard')
  }

  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([fullText], { type: 'text/plain' }))
    a.download = `cancel-${sub.merchantKey}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const print = () => {
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) return
    const pre = w.document.createElement('pre')
    pre.textContent = body
    pre.style.cssText = 'font: 14px/1.6 Georgia, serif; white-space: pre-wrap; max-width: 640px; margin: 48px auto; color: #111;'
    w.document.title = `Cancellation — ${sub.name}`
    w.document.body.appendChild(pre)
    w.focus()
    w.print()
  }

  const locked = !isPro

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard/cancel" className="type-label inline-flex items-center gap-2 hover:underline">
        <ArrowLeft className="size-4" /> Cancel Copilot
      </Link>

      <header className="mt-8 flex flex-wrap items-end gap-5">
        <Monogram name={sub.name} className="size-16 text-[22px]" />
        <div className="min-w-0 flex-1">
          <h1 className="type-display">Cancel {sub.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-dim">
            <FrictionMeter difficulty={guide.difficulty} className="text-ink" />
            <span className="type-label">
              {formatMoney(sub.cost, { cents: true })}/{sub.cycle === 'yearly' ? 'yr' : sub.cycle === 'weekly' ? 'wk' : 'mo'} · next charge {formatShortDate(sub.nextBillingDate)}
            </span>
          </div>
        </div>
        {sub.yearlyWaste > 0 ? (
          <div className="text-right">
            <p className="tabular text-[34px] leading-none font-semibold tracking-[-0.04em] text-leak-ink">{formatMoney(Math.round(sub.yearlyWaste))}</p>
            <p className="type-label mt-1 text-dim">wasted per year</p>
          </div>
        ) : null}
      </header>

      <div className="mt-10 grid grid-cols-1 gap-[10px] lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-[10px]">
          <Panel className="p-5 sm:p-6">
            <Bullet>How to cancel</Bullet>
            <div className="mt-5">
              <GuideBody merchant={{ name: sub.name, cancel: guide }} />
            </div>
          </Panel>
          {sub.leakReasons.length ? (
            <Panel tone="sand" className="p-5 sm:p-6">
              <Bullet>Why it’s on your list</Bullet>
              <ul className="mt-4 space-y-3 pl-4">
                {sub.leakReasons.map((r) => (
                  <li key={r.kind} className="text-[14px]">
                    <span className="font-semibold">{r.label}</span>
                    <span className="block">{r.detail}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <Panel tone="panel2" className="relative overflow-hidden p-5 sm:p-7">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-4">
                <span className="grid size-12 place-items-center rounded-full bg-lime">
                  <Check className="size-5" />
                </span>
                <h2 className="type-display mt-6">Request {method === 'email' ? 'sent' : 'logged'}</h2>
                <p className="mt-3 max-w-md text-[15px]">
                  {method === 'email' ? 'Replies go straight to your inbox. Vendors usually confirm within 1–3 business days.' : 'Mail it by certified post and keep the receipt.'}
                </p>
                <ol className="mt-8 space-y-[3px]">
                  {[
                    { label: `${method === 'email' ? 'Sent' : 'Logged'} ${formatShortDate(sent.slice(0, 10))}`, done: true },
                    { label: 'Vendor confirms cancellation', done: false },
                    { label: `No charge on ${formatShortDate(sub.nextBillingDate)}`, done: false },
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-3 bg-white px-4 py-3 text-[14px]">
                      <span className={cn('grid size-5 place-items-center rounded-full text-[10px]', step.done ? 'bg-ink text-white' : 'bg-panel text-dim')}>
                        {step.done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={step.done ? '' : 'text-dim'}>{step.label}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-wrap gap-px">
                  <Button onClick={markCancelled} disabled={pending || sub.status === 'cancelled'}>
                    {pending ? <Loader2 className="animate-spin" /> : null}
                    {sub.status === 'cancelled' ? 'Marked cancelled' : 'They confirmed — mark cancelled'}
                  </Button>
                  <Button variant="secondary" onClick={() => setSent(null)}>
                    Send again
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Bullet>Cancellation request</Bullet>
                  <div className="flex gap-px" role="tablist">
                    {(
                      [
                        ['email', 'Email it for me'],
                        ['letter', 'Printable letter'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        role="tab"
                        aria-selected={method === id}
                        onClick={() => setMethod(id)}
                        className={cn('h-10 px-4 text-[13px] transition-colors', method === id ? 'bg-ink text-white' : 'bg-white hover:bg-panel')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-[10px] sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="region">Consumer-rights region</Label>
                    <Select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)}>
                      {REGIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {method === 'email' ? (
                    <div className="space-y-2">
                      <Label htmlFor="recipient">Vendor support email</Label>
                      <Input id="recipient" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="support@vendor.com" disabled={locked} />
                    </div>
                  ) : null}
                </div>
                {method === 'email' ? (
                  <div className="mt-[10px] space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value)
                        setEdited(true)
                      }}
                      disabled={locked}
                    />
                  </div>
                ) : null}

                <div className="relative mt-[10px] space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="body">Letter</Label>
                    {edited ? (
                      <button onClick={reset} className="type-label flex items-center gap-1 hover:underline">
                        <RotateCcw className="size-3" /> Reset to template
                      </button>
                    ) : (
                      <Badge tone="insight">Generated for {REGIONS.find((r) => r.value === region)?.label}</Badge>
                    )}
                  </div>
                  <Textarea
                    id="body"
                    rows={16}
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value)
                      setEdited(true)
                    }}
                    readOnly={locked}
                    className={cn(locked && 'select-none')}
                  />
                  {locked ? (
                    <div className="absolute inset-x-0 top-28 bottom-0 grid place-items-center bg-gradient-to-b from-transparent via-panel-2/90 to-panel-2 backdrop-blur-[3px]">
                      <div className="max-w-xs text-center">
                        <Lock className="mx-auto size-5" />
                        <p className="type-title mt-3">Letters are a Pro feature</p>
                        <p className="mt-2 text-[14px]">Get the full letter, send it in one click, and track the vendor’s reply.</p>
                        <UpgradeButton className="mt-5" reason={`Cancel ${sub.name} in one click — and stop ${formatMoney(Math.round(sub.yearlyWaste || sub.yearlyCost))}/yr from leaving your account.`}>
                          Unlock letters
                        </UpgradeButton>
                      </div>
                    </div>
                  ) : null}
                </div>

                <p className="type-label mt-3 text-dim">
                  {method === 'email'
                    ? 'Sent from SubShield’s cancellation address with you in CC; replies go to you. Find the vendor’s address on their help or contact page.'
                    : 'Fill in the bracketed addresses, sign it, and send it by certified mail with return receipt.'}{' '}
                  Not legal advice.
                </p>

                <div className="mt-6 flex flex-wrap gap-px">
                  {method === 'email' ? (
                    <Button onClick={send} disabled={locked || pending || !recipient}>
                      {pending ? <Loader2 className="animate-spin" /> : null} {demo ? 'Send (demo)' : 'Send cancellation'}
                    </Button>
                  ) : (
                    <Button onClick={send} disabled={locked || pending}>
                      {pending ? <Loader2 className="animate-spin" /> : null} I’ve mailed it
                    </Button>
                  )}
                  <Button variant="secondary" onClick={copy} disabled={locked}>
                    <Copy /> Copy
                  </Button>
                  <Button variant="secondary" onClick={download} disabled={locked}>
                    <Download /> .txt
                  </Button>
                  {method === 'letter' ? (
                    <Button variant="secondary" onClick={print} disabled={locked}>
                      <Printer /> Print
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </div>
    </div>
  )
}
