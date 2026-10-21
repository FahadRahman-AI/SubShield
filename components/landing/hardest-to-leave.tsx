'use client'

import { useState } from 'react'
import { CHANNEL_LABEL, FrictionMeter } from '@/components/cancel/library'
import { MERCHANTS } from '@/lib/catalog/merchants'
import { cn } from '@/lib/utils'
import { SectionTitle } from './sections'

const NIGHTMARES = MERCHANTS.filter((m) => m.cancel.difficulty === 'nightmare').slice(0, 6)
const TONES = ['bg-sand', 'bg-panel-2', 'bg-panel', 'bg-sand', 'bg-panel-2', 'bg-panel']

/**
 * Overlapping cards that open sideways on hover/focus — the dark-pattern
 * library in miniature. On small screens they become a swipeable row.
 */
export function HardestToLeave() {
  const [active, setActive] = useState(0)

  return (
    <section className="py-20">
      <div className="gutter">
        <SectionTitle>Hardest to leave</SectionTitle>
        <p className="mt-4 max-w-lg text-dim">From the dark-pattern library: the vendors that make cancelling a project — and the way out of each.</p>
      </div>
      <div className="gutter mt-10 flex snap-x gap-[10px] overflow-x-auto pb-4 lg:gap-0 lg:overflow-visible">
        {NIGHTMARES.map((m, i) => {
          const open = active === i
          return (
            <article
              key={m.key}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={cn(
                'relative flex h-[340px] w-[82vw] shrink-0 snap-start flex-col overflow-hidden p-5 outline-none transition-[width,flex-basis] duration-700 ease-[var(--ease-cascade)] sm:w-[360px] lg:w-auto',
                open ? 'lg:basis-[38%]' : 'lg:basis-[12.4%]',
                TONES[i],
              )}
            >
              <h3 className="type-title max-w-[16ch]">{m.name}</h3>
              <div className={cn('mt-4 transition-opacity duration-500', open ? 'opacity-100' : 'lg:opacity-0')}>
                <p className="max-w-[40ch] text-[13.5px] leading-relaxed">
                  {m.cancel.darkPatterns[0]}. {m.cancel.steps[0]}.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-6 whitespace-nowrap">
                <FrictionMeter difficulty={m.cancel.difficulty} />
                <span className={cn('type-label transition-opacity duration-500', open ? 'opacity-100' : 'lg:opacity-0')}>{CHANNEL_LABEL[m.cancel.channel]}</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
