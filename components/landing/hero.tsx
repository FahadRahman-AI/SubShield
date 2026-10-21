'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { LeakReportScreen, PhoneFrame } from '@/components/mockup/phone'
import { SplitWords } from '@/components/motion/reveal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CalendarObject, DuplicateObject, ReceiptObject, ScissorsObject, ShieldObject, TagObject, Tile } from './tiles'

const EASE = [0.16, 1, 0.3, 1] as const

// Grid positions for sm+ (4 columns; the phone owns columns 3–4).
// On mobile the grid is 2 columns and only the first two tiles show above the phone.
const TILES = [
  { tone: 'bg-butter', label: 'Promo rate ended', obj: <ReceiptObject />, pos: 'col-start-1 row-start-1' },
  { tone: 'bg-coral', label: 'Cut', obj: <ScissorsObject />, pos: 'col-start-2 row-start-1' },
  { tone: 'bg-blush', label: 'Price hike', obj: <TagObject />, pos: 'col-start-2 row-start-2' },
  { tone: 'bg-lavender', label: 'Renewal warning', obj: <CalendarObject />, pos: 'col-start-1 row-start-3' },
  { tone: 'bg-olive', label: 'Billed twice', obj: <DuplicateObject />, pos: 'col-start-2 row-start-3' },
  { tone: 'bg-sky', label: 'Read-only', obj: <ShieldObject />, pos: 'col-start-1 row-start-4' },
]
const MOBILE_TILES = 2

export function Hero() {
  return (
    // Split screen only from xl: below that a half-width panel is too narrow for
    // the gallery plus a 300px phone, so the halves stack.
    <section className="grid grid-cols-1 xl:min-h-[100svh] xl:grid-cols-2">
      {/* Left half: statement top, caption + actions bottom */}
      <div className="gutter flex flex-col justify-between pt-28 pb-10 sm:pt-32 xl:min-h-[100svh] xl:pb-8">
        <h1 className="type-hero max-w-[14ch]">
          <SplitWords text="Find, understand and cut recurring charges before they drain you" delay={0.1} />
        </h1>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.9, ease: EASE }} className="mt-14">
          <p className="max-w-md text-[15px] leading-relaxed text-dim">
            SubShield reads your bank feed and inbox, finds forgotten subscriptions, silent price hikes and duplicates — then writes the
            cancellation for you.
          </p>
          <div className="mt-6 flex flex-wrap gap-px">
            <Button asChild size="lg">
              <Link href="/login" data-track="hero">
                Run my free scan
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#how">How it works</a>
            </Button>
          </div>
          <p className="type-label mt-6 text-dim">Read-only bank access via Plaid · No card required</p>
        </motion.div>
      </div>

      {/* Right half: a gallery of leak "objects" around the app */}
      <div className="relative overflow-hidden bg-panel px-4 pt-6 pb-10 sm:px-8 xl:pt-24 xl:pl-[54px]">
        <div className="relative grid w-full max-w-[640px] grid-cols-2 grid-rows-[repeat(3,minmax(0,170px))] gap-[10px] sm:grid-cols-4 sm:grid-rows-[repeat(4,196px)]">
          {TILES.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08, duration: 1, ease: EASE }}
              className={cn('flex', t.pos, i >= MOBILE_TILES && 'max-sm:hidden')}
            >
              <Tile tone={t.tone} label={t.label} className="w-full">
                {t.obj}
              </Tile>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.2, ease: EASE }}
            className="col-span-2 col-start-1 row-start-2 row-end-4 flex justify-center sm:col-start-3 sm:row-start-1 sm:row-end-5 sm:items-start sm:pt-6"
          >
            {/* Columns 3–4 are ≥272px wide at every sm+ width (max-w-[640px] grid), so 0.9 fits; full size from 1440px. */}
            <PhoneFrame label="SubShield app: leak report showing $1,850 a year of waste across 14 leaks" className="origin-top scale-[0.62] sm:scale-[0.9] min-[1440px]:scale-100">
              <LeakReportScreen />
            </PhoneFrame>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
