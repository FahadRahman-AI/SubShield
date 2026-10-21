'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatShortDate } from '@/lib/dates'
import type { DashboardData } from '@/lib/data/types'
import { cn, formatMoney } from '@/lib/utils'

// Categorical slots validated (dataviz validator) against the #e7e2da panel in
// fixed order. Four slots sit below 3:1 contrast, so every slice is also named
// in the legend with its exact value and share (the required "relief").
// "Other" is neutral gray, never a generated hue.
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6']
const OTHER = '#8a8781'
const SURFACE = '#e7e2da'

type Mode = 'spend' | 'waste'

export function CategoryDonut({ categories }: { categories: DashboardData['categories'] }) {
  const [mode, setMode] = useState<Mode>('spend')
  const [active, setActive] = useState<string | null>(null)

  // Colours follow the category (ranked by spend), not the current view's rank,
  // so toggling Spend/Waste never repaints a slice.
  const colorFor = useMemo(() => {
    const map = new Map<string, string>()
    categories.slice(0, SERIES.length).forEach((c, i) => map.set(c.category, SERIES[i]))
    return (name: string) => map.get(name) ?? OTHER
  }, [categories])

  const rows = useMemo(() => {
    const value = (c: DashboardData['categories'][number]) => (mode === 'spend' ? c.yearly : c.waste)
    const head = categories.slice(0, SERIES.length).map((c) => ({ name: c.category as string, value: value(c) }))
    const tail = categories.slice(SERIES.length)
    if (tail.length) head.push({ name: 'Other', value: tail.reduce((t, c) => t + value(c), 0) })
    return head.filter((r) => r.value > 0).sort((a, b) => b.value - a.value)
  }, [categories, mode])

  const total = rows.reduce((t, r) => t + r.value, 0)
  const focus = rows.find((r) => r.name === active)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px]">By category</h3>
        <div className="flex gap-px text-[12.5px]" role="radiogroup" aria-label="Measure">
          {(['spend', 'waste'] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn('px-3 py-1.5 capitalize transition-colors', mode === m ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-panel-2')}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto mt-5 aspect-square w-full max-w-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius="70%"
              outerRadius="100%"
              stroke={SURFACE}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              animationDuration={800}
              onMouseEnter={(_, i) => setActive(rows[i]?.name ?? null)}
              onMouseLeave={() => setActive(null)}
            >
              {rows.map((r) => (
                <Cell key={r.name} fill={colorFor(r.name)} opacity={active && active !== r.name ? 0.3 : 1} className="outline-none" />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              content={({ active: on, payload }) =>
                on && payload?.[0] ? (
                  <div className="bg-ink px-3 py-2 text-[12px] text-white">
                    <p className="text-white/70">{String(payload[0].name)}</p>
                    <p className="tabular">
                      {formatMoney(Number(payload[0].value), { cents: false })}/yr · {Math.round((Number(payload[0].value) / total) * 100)}%
                    </p>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="type-label text-dim">{focus ? focus.name : mode === 'spend' ? 'Yearly spend' : 'Yearly waste'}</p>
            <p className="tabular text-[26px] font-semibold tracking-[-0.04em]">{formatMoney(Math.round(focus ? focus.value : total))}</p>
          </div>
        </div>
      </div>

      <ul className="mt-5">
        {rows.map((r) => (
          <li
            key={r.name}
            onMouseEnter={() => setActive(r.name)}
            onMouseLeave={() => setActive(null)}
            className={cn('flex items-center gap-2.5 px-2 py-1.5 text-[13px] transition-colors', active === r.name && 'bg-page')}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorFor(r.name) }} />
            <span className="flex-1 truncate">{r.name}</span>
            <span className="tabular">{formatMoney(Math.round(r.value))}</span>
            <span className="tabular w-9 text-right text-dim">{Math.round((r.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Charge history: one bar per charge; the latest price is marked when it rose. */
export function ChargeHistory({ history, previousCost }: { history: { date: string; amount: number }[]; previousCost: number | null }) {
  const [hover, setHover] = useState<number | null>(null)
  if (history.length < 2) return <p className="type-label text-dim">Not enough history yet.</p>
  const recent = history.slice(-14)
  const max = Math.max(...recent.map((h) => h.amount))
  const latest = recent[recent.length - 1].amount
  const h = hover !== null ? recent[hover] : null

  return (
    <div>
      <div className="type-label flex items-baseline justify-between">
        <span className="text-dim">Last {recent.length} charges</span>
        <span className="tabular">{h ? `${formatShortDate(h.date)} · ${formatMoney(h.amount, { cents: true })}` : null}</span>
      </div>
      <div className="mt-2 flex h-16 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
        {recent.map((c, i) => {
          const raised = previousCost !== null && c.amount > previousCost && c.amount === latest
          return (
            <button
              key={`${c.date}-${i}`}
              type="button"
              aria-label={`${formatShortDate(c.date)}: ${formatMoney(c.amount, { cents: true })}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              className="flex h-full flex-1 items-end"
            >
              <span
                style={{ height: `${Math.max(8, (c.amount / max) * 100)}%` }}
                className={cn('block w-full rounded-t-[3px] transition-opacity', raised ? 'bg-leak' : 'bg-sand', hover !== null && hover !== i && 'opacity-40')}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
