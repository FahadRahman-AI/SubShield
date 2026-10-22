import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/logo'
import { Footer } from '@/components/landing/footer'
import { formatShortDate } from '@/lib/dates'
import { LEGAL, LEGAL_IS_DRAFT } from '@/lib/legal'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

/** Two-column legal document: section index on the left, text on the right. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <header className="gutter flex h-20 items-center justify-between">
        <Logo />
        <nav className="type-label flex gap-5">
          <Link href="/legal/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:underline">
            Terms
          </Link>
        </nav>
      </header>
      <main className="gutter pt-10 pb-24">
        {LEGAL_IS_DRAFT ? (
          <p role="note" className="mb-10 max-w-3xl bg-mustard p-4 text-[14px]">
            <strong>Draft.</strong> Company details are still placeholders (lib/legal.ts), and this document should be reviewed by a UK solicitor before
            SubShield takes payments.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <h1 className="type-display">{title}</h1>
            <p className="type-label mt-4 text-dim">Last updated {formatShortDate(LEGAL.lastUpdated)}, {LEGAL.lastUpdated.slice(0, 4)}</p>
            <ol className="type-label mt-8 hidden space-y-1.5 lg:block">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="hover:underline">
                    {String(i + 1).padStart(2, '0')} {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
          <article className="max-w-2xl text-[15px] leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
            <div className="text-[17px]">{intro}</div>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="mt-12 scroll-mt-10">
                <h2 className="type-title">
                  <span className="tabular mr-3 text-dim">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
