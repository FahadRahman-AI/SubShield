import { AppShowcase } from '@/components/landing/app-showcase'
import { CheckAndAsk } from '@/components/landing/check-and-ask'
import { FinalCta, Footer } from '@/components/landing/footer'
import { HardestToLeave } from '@/components/landing/hardest-to-leave'
import { Hero } from '@/components/landing/hero'
import { Nav } from '@/components/landing/nav'
import { Pricing } from '@/components/landing/pricing'
import { CaughtCards, LeakStrip, NumberedCards, SecurityList, Statement } from '@/components/landing/sections'

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Statement />
        <NumberedCards />
        <LeakStrip />
        <AppShowcase />
        <CaughtCards />
        <HardestToLeave />
        <Pricing />
        <CheckAndAsk />
        <SecurityList />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
