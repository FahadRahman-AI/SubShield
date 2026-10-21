import Link from 'next/link'
import { Wordmark } from '@/components/brand/logo'
import { Reveal } from '@/components/motion/reveal'
import { Button } from '@/components/ui/button'

export function FinalCta() {
  return (
    <section className="gutter py-28 sm:py-40">
      <Reveal className="mx-auto max-w-4xl text-center">
        <p className="type-display">Your subscriptions are counting on you not looking.</p>
        <div className="mt-10 flex justify-center gap-px">
          <Button asChild size="lg">
            <Link href="/login" data-track="final-cta">
              Run my free scan
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a href="#pricing">See pricing</a>
          </Button>
        </div>
      </Reveal>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="bg-panel">
      <div className="gutter grid grid-cols-1 gap-10 py-14 md:grid-cols-[1fr_2fr]">
        <div>
          <Wordmark />
          <p className="type-label mt-4 max-w-[30ch] text-dim">Find, understand and cut recurring charges before they drain you.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-[15px] sm:grid-cols-3">
          <ul className="space-y-1.5">
            <li><a href="#how" className="hover:underline">How it works</a></li>
            <li><a href="#app" className="hover:underline">Mobile app</a></li>
            <li><a href="#pricing" className="hover:underline">Price</a></li>
          </ul>
          <ul className="space-y-1.5">
            <li><a href="#check" className="hover:underline">FAQ</a></li>
            <li><Link href="/login" className="hover:underline">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <p className="gutter type-label pb-8 text-dim">© 2026 SubShield. Not a bank. Bank connections by Plaid. Cancellation templates are not legal advice.</p>
    </footer>
  )
}
