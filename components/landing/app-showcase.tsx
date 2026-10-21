'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CancelScreen, LeakReportScreen, PhoneFrame, RenewalAlertScreen } from '@/components/mockup/phone'
import { Reveal } from '@/components/motion/reveal'
import { Button } from '@/components/ui/button'
import { Bullet } from '@/components/ui/panel'

const EASE = [0.16, 1, 0.3, 1] as const

const POINTS = ['Renewal alerts three days before you’re charged', 'New subscriptions flagged the day they post', 'Cancel from your phone in one tap']

export function AppShowcase() {
  return (
    <section id="app" className="grid scroll-mt-16 grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
      <div className="gutter flex flex-col justify-between py-20 lg:py-24">
        <div>
          <Reveal>
            <h2 className="type-display max-w-[12ch]">The leak report, in your pocket</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-10 space-y-3">
              {POINTS.map((p) => (
                <li key={p}>
                  <Bullet>{p}</Bullet>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="mt-14">
          <p className="type-label max-w-sm text-dim">Native iPhone and Android apps are in development. Until they ship, the web app works on your phone and renewal alerts arrive by email or SMS.</p>
          <div className="mt-3 flex flex-wrap gap-px">
            <Button asChild size="lg">
              <Link href="/login" data-track="app-showcase">
                Open the web app
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#how">How it works</a>
            </Button>
          </div>
        </Reveal>
      </div>

      <div className="relative flex min-h-[640px] items-center justify-center overflow-hidden bg-sand px-4 py-16 sm:min-h-[760px]">
        <div className="relative flex items-start justify-center">
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 40 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, ease: EASE }}
            className="-mr-24 hidden origin-top scale-[0.86] md:block"
          >
            <PhoneFrame label="Lock screen with SubShield alerts: Headspace renews in 3 days, an Adobe price hike, and a new SiriusXM subscription">
              <RenewalAlertScreen />
            </PhoneFrame>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, delay: 0.1, ease: EASE }}
            className="relative z-10"
          >
            <div className="animate-float">
              <PhoneFrame label="SubShield app: leak report showing $1,850 a year of waste across 14 leaks" className="scale-[0.9] sm:scale-100">
                <LeakReportScreen />
              </PhoneFrame>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 40 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
            className="-ml-24 hidden origin-top scale-[0.86] md:block"
          >
            <PhoneFrame label="SubShield app: Audible cancellation request sent, saving $179.40 a year">
              <CancelScreen />
            </PhoneFrame>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
