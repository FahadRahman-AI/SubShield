'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Inbox, Loader2, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createContext, use, useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Bullet, Panel } from '@/components/ui/panel'
import { connectBank, connectDemoMailbox, createPlaidLinkToken } from '@/lib/actions/connections'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'

const EASE = [0.16, 1, 0.3, 1] as const

const STEPS = [
  'Establishing read-only connection',
  'Pulling 24 months of transactions',
  'Clustering charges by merchant and amount',
  'Classifying billing cycles',
  'Checking price history for hikes',
  'Matching against the dark-pattern library',
  'Calculating your Waste Index',
]

const FOUND = [
  { name: 'Netflix', tone: 'bg-blush' },
  { name: 'Spotify', tone: 'bg-lime' },
  { name: 'Adobe', tone: 'bg-coral' },
  { name: 'iCloud+', tone: 'bg-sky' },
  { name: 'Audible', tone: 'bg-butter' },
  { name: 'HBO Max', tone: 'bg-lavender' },
  { name: 'NYTimes', tone: 'bg-mustard' },
  { name: 'Hulu', tone: 'bg-olive' },
  { name: 'ChatGPT', tone: 'bg-sand' },
  { name: 'Planet Fitness', tone: 'bg-blush' },
  { name: 'NordVPN', tone: 'bg-sky' },
  { name: 'Uber One', tone: 'bg-lime' },
]

/** The "scan" — runs at least `minMs` and until `done` flips. Remounted per scan (key). */
export function ScanOverlay({ active, done, onFinished, minMs = 5200 }: { active: boolean; done: boolean; onFinished: () => void; minMs?: number }) {
  const [step, setStep] = useState(0)
  const [count, setCount] = useState(0)
  const [elapsed, setElapsed] = useState(false)
  const finished = useRef(false)

  useEffect(() => {
    if (!active) return
    const stepId = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), minMs / STEPS.length)
    const countId = setInterval(() => setCount((c) => Math.min(c + 9 + Math.floor(Math.random() * 12), 1284)), 70)
    const t = setTimeout(() => setElapsed(true), minMs)
    return () => {
      clearInterval(stepId)
      clearInterval(countId)
      clearTimeout(t)
    }
  }, [active, minMs])

  useEffect(() => {
    if (active && done && elapsed && !finished.current) {
      finished.current = true
      const t = setTimeout(onFinished, 500)
      return () => clearTimeout(t)
    }
  }, [active, done, elapsed, onFinished])

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="fixed inset-0 z-[60] grid grid-cols-1 bg-page lg:grid-cols-2"
          role="status"
          aria-live="polite"
        >
          <div className="gutter flex flex-col justify-between py-10">
            <p className="type-label text-dim">Scanning</p>
            <div>
              <p className="tabular type-hero">{(done && elapsed ? 1284 : count).toLocaleString()}</p>
              <p className="mt-2 text-dim">transactions analysed</p>
              <div className="mt-10 h-14 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p key={step} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="type-title">
                    {STEPS[step]}…
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="mt-6 flex h-1.5 max-w-md bg-panel-2">
                <motion.div className="h-full bg-ink" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
              </div>
            </div>
            <p className="type-label text-dim">Read-only · nothing leaves your bank but the transaction list</p>
          </div>
          <div className="hidden content-start gap-[10px] overflow-hidden bg-panel p-[54px] lg:grid lg:grid-cols-4">
            {FOUND.slice(0, Math.min(FOUND.length, step * 2 + 1)).map((m) => (
              <motion.div key={m.name} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className={cn('flex aspect-[3/4] items-end p-3', m.tone)}>
                <span className="type-label">{m.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

interface ScanContextValue {
  scanning: boolean
  /** Bumps when a scan overlay closes, so dashboards can replay their reveal animations. */
  revealKey: number
  start: () => void
  complete: () => void
  fail: () => void
}

const ScanContext = createContext<ScanContextValue | null>(null)

export function useScan() {
  const ctx = use(ScanContext)
  if (!ctx) throw new Error('useScan must be used inside <ScanProvider>')
  return ctx
}

/**
 * Lives in the dashboard layout so the scan overlay survives the page
 * re-render that a completed connection triggers.
 */
export function ScanProvider({ children }: { children: ReactNode }) {
  const [scanning, setScanning] = useState(false)
  const [done, setDone] = useState(false)
  const [revealKey, setRevealKey] = useState(0)
  const [scanId, setScanId] = useState(0)
  const router = useRouter()

  return (
    <ScanContext
      value={{
        scanning,
        revealKey,
        start: () => {
          setDone(false)
          setScanId((n) => n + 1)
          setScanning(true)
        },
        complete: () => setDone(true),
        fail: () => setScanning(false),
      }}
    >
      {children}
      <ScanOverlay
        key={scanId}
        active={scanning}
        done={done}
        onFinished={() => {
          setScanning(false)
          setRevealKey((k) => k + 1)
          router.refresh()
          track('scan_completed')
          toast.success('Scan complete', { description: 'Your leak report is ready.' })
        }}
      />
    </ScanContext>
  )
}

function PlaidLauncher({ token, onSuccess, onExit }: { token: string; onSuccess: (publicToken: string, institution: string | null) => void; onExit: () => void }) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken, metadata) => publicToken && onSuccess(publicToken, metadata.institution?.name ?? null),
    onExit: () => onExit(),
  })
  useEffect(() => {
    if (ready) open()
  }, [ready, open])
  return null
}

/** Button that opens Plaid Link (or the demo scan) and runs the first scan. */
export function ConnectBankButton({ demo, label = 'Connect bank or card', size = 'lg', className }: { demo: boolean; label?: string; size?: 'md' | 'lg'; className?: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const scan = useScan()

  const runScan = (publicToken: string, institution: string | null) => {
    setToken(null)
    scan.start()
    startTransition(async () => {
      const res = await connectBank({ publicToken, institution })
      if (!res.ok) {
        scan.fail()
        toast.error(res.error)
        return
      }
      scan.complete()
    })
  }

  const begin = () =>
    startTransition(async () => {
      track('scan_started', { demo })
      const res = await createPlaidLinkToken()
      if (!res.ok || !res.data) {
        toast.error(res.ok ? 'Could not start Plaid.' : res.error)
        return
      }
      if (demo) runScan('demo-public-token-0000', 'Chase')
      else setToken(res.data)
    })

  return (
    <>
      <Button size={size} onClick={begin} disabled={pending || scan.scanning} className={className}>
        {pending && !scan.scanning ? <Loader2 className="animate-spin" /> : null}
        {label}
      </Button>
      {token ? <PlaidLauncher token={token} onSuccess={runScan} onExit={() => setToken(null)} /> : null}
    </>
  )
}

export function ConnectMailboxButtons({ demo, connected }: { demo: boolean; connected?: boolean }) {
  const [pending, startTransition] = useTransition()
  if (demo) {
    return (
      <Button
        variant="secondary"
        disabled={pending || connected}
        onClick={() =>
          startTransition(async () => {
            const res = await connectDemoMailbox()
            if (res.ok) toast.success('Gmail connected', { description: 'Demo mode: receipts and cancellation emails are now included.' })
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <Mail />}
        {connected ? 'Gmail connected' : 'Connect Gmail'}
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap gap-px">
      <Button asChild variant="secondary">
        {/* OAuth redirects need a full-page navigation to a route handler, not a client-side <Link>. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/connect/google">
          <Mail /> Connect Gmail
        </a>
      </Button>
      <Button asChild variant="secondary">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/connect/microsoft">
          <Inbox /> Connect Outlook
        </a>
      </Button>
    </div>
  )
}

export function ConnectHero({ demo }: { demo: boolean }) {
  return (
    <div className="mx-auto max-w-6xl py-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
        <p className="type-label text-dim">Step 1 of 1</p>
        <h1 className="type-hero mt-4 max-w-[13ch]">Let’s find out what’s draining you</h1>
        <p className="mt-6 max-w-xl text-dim">Connect a bank or card. The scan reads up to 24 months of charges and takes about a minute.</p>
      </motion.div>

      <div className="mt-12 grid grid-cols-1 gap-[10px] md:grid-cols-[1.3fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.9, ease: EASE }}>
          <Panel className="flex h-full min-h-[340px] flex-col p-6">
            <Bullet>Bank & credit cards</Bullet>
            <ul className="mt-8 space-y-2 text-[15px]">
              <li>Read-only. We can’t move money.</li>
              <li>Your bank login never touches our servers.</li>
              <li>Disconnect any time — the data is deleted.</li>
            </ul>
            <div className="mt-auto pt-10">
              <ConnectBankButton demo={demo} className="w-full" />
              <p className="type-label mt-3 text-dim">{demo ? 'Demo mode: runs the real engine on a seeded 14-month ledger.' : 'Via Plaid · 12,000+ institutions'}</p>
            </div>
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.9, ease: EASE }}>
          <Panel tone="sand" className="flex h-full min-h-[340px] flex-col p-6">
            <Bullet>Inbox (optional)</Bullet>
            <p className="mt-8 text-[15px] leading-relaxed">
              Catches App Store subscriptions, price-change notices and — our favourite — vendors that keep charging after you cancel.
            </p>
            <p className="type-label mt-auto pt-10">Connect it after your first scan, from Connections.</p>
          </Panel>
        </motion.div>
      </div>
    </div>
  )
}
