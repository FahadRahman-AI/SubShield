import { describe, expect, it } from 'vitest'
import { addDays, addMonths } from '@/lib/dates'
import { buildDemoLedger } from '@/lib/demo/ledger'
import { detectSubscriptions, pickTeaser } from './engine'
import { normalizeDescriptor, resolveMerchant } from './normalize'
import type { Charge } from './types'

const TODAY = '2026-10-19'

let id = 0
function monthly(description: string, amounts: number[], day = 5, extra: Partial<Charge> = {}): Charge[] {
  // amounts[0] is the oldest charge; the last one lands this month.
  return amounts.map((amount, i) => ({
    id: `t${++id}`,
    source: 'bank' as const,
    description,
    amount,
    date: addMonths('2026-10-01', i - (amounts.length - 1), day),
    ...extra,
  }))
}

describe('normalize', () => {
  it('strips processor prefixes, punctuation and store numbers', () => {
    expect(normalizeDescriptor('SQ *BLUE BOTTLE #10234')).toBe('blue bottle')
    expect(normalizeDescriptor('GOOGLE *Google One')).toBe('google one')
    expect(normalizeDescriptor('APPLE.COM/BILL')).toBe('apple com bill')
  })

  it('disambiguates shared Apple descriptors by price point', () => {
    expect(resolveMerchant({ description: 'APPLE.COM/BILL', amount: 2.99 })?.key).toBe('icloud')
    expect(resolveMerchant({ description: 'APPLE.COM/BILL', amount: 10.99 })?.key).toBe('apple-music')
    expect(resolveMerchant({ description: 'APPLE.COM/BILL', amount: 5.49 })?.key).toBe('apple-other')
  })

  it('rejects transfers, rent and payroll', () => {
    expect(resolveMerchant({ description: 'ZELLE TO LANDLORD RENT' })).toBeNull()
    expect(resolveMerchant({ description: 'ONLINE TRANSFER TO SAV' })).toBeNull()
  })
})

describe('detectSubscriptions', () => {
  it('detects a monthly subscription and its next billing date', () => {
    const [sub] = detectSubscriptions({ charges: monthly('NETFLIX.COM', Array(6).fill(15.49), 4), today: TODAY })
    expect(sub.merchantKey).toBe('netflix')
    expect(sub.cycle).toBe('monthly')
    expect(sub.cost).toBe(15.49)
    expect(sub.nextBillingDate).toBe('2026-11-04')
    expect(sub.confidence).toBeGreaterThan(0.8)
  })

  it('flags a price hike with the right yearly impact', () => {
    const [sub] = detectSubscriptions({ charges: monthly('NETFLIX.COM', [15.49, 15.49, 15.49, 17.99, 17.99]), today: TODAY })
    const hike = sub.leakReasons.find((r) => r.kind === 'price_hike')
    expect(sub.previousCost).toBe(15.49)
    expect(hike?.yearlyImpact).toBe(30)
  })

  it('catches an intro rate ending even when the jump is large', () => {
    const [sub] = detectSubscriptions({ charges: monthly('NYTIMES*NYTDIGITAL', [4, 4, 4, 4, 25, 25]), today: TODAY })
    expect(sub.cost).toBe(25)
    expect(sub.leakReasons.find((r) => r.kind === 'price_hike')?.yearlyImpact).toBe(252)
  })

  it('detects duplicate billing across two cards', () => {
    const charges = [
      ...monthly('APPLE.COM/BILL', Array(8).fill(2.99), 2, { accountId: 'a' }),
      ...monthly('APPLE.COM/BILL', Array(4).fill(2.99), 3, { accountId: 'b' }),
    ]
    const [sub] = detectSubscriptions({ charges, today: TODAY })
    expect(sub.merchantKey).toBe('icloud')
    expect(sub.leakReasons.map((r) => r.kind)).toContain('duplicate_charge')
    expect(sub.yearlyCost).toBeCloseTo(71.76)
  })

  it('flags redundant services in the same overlap group, keeping the priciest', () => {
    const subs = detectSubscriptions({
      charges: [...monthly('NETFLIX.COM', Array(5).fill(17.99), 4), ...monthly('HULU', Array(5).fill(9.99), 12)],
      today: TODAY,
    })
    const hulu = subs.find((s) => s.merchantKey === 'hulu')!
    const netflix = subs.find((s) => s.merchantKey === 'netflix')!
    expect(hulu.leakReasons.some((r) => r.kind === 'redundant')).toBe(true)
    expect(netflix.leakReasons.some((r) => r.kind === 'redundant')).toBe(false)
  })

  it('ignores subscriptions that already stopped', () => {
    const charges = monthly('SPOTIFY USA', Array(6).fill(11.99)).map((c) => ({ ...c, date: addMonths(c.date, -4) }))
    expect(detectSubscriptions({ charges, today: TODAY })).toHaveLength(0)
  })

  it('needs a real pattern for unknown merchants', () => {
    const two = monthly('LOCAL YOGA STUDIO', [40, 40])
    expect(detectSubscriptions({ charges: two, today: TODAY })).toHaveLength(0)
    const four = monthly('LOCAL YOGA STUDIO', [40, 40, 40, 40])
    expect(detectSubscriptions({ charges: four, today: TODAY })[0]?.merchantKey).toBe('local-yoga-studio')
  })

  it('detects a trial that converted and charges after a cancellation email', () => {
    const trial: Charge[] = [
      { id: 'x1', source: 'bank', description: 'SIRIUSXM', amount: 1, date: addDays(TODAY, -70) },
      { id: 'x2', source: 'bank', description: 'SIRIUSXM', amount: 10.99, date: addDays(TODAY, -40) },
      { id: 'x3', source: 'bank', description: 'SIRIUSXM', amount: 10.99, date: addDays(TODAY, -10) },
    ]
    const [sirius] = detectSubscriptions({ charges: trial, today: TODAY })
    expect(sirius.leakReasons.map((r) => r.kind)).toContain('trial_conversion')

    const [audible] = detectSubscriptions({
      charges: monthly('AUDIBLE*US', Array(6).fill(14.95), 8),
      signals: [{ merchantKey: 'audible', kind: 'cancellation', date: '2026-07-01' }],
      today: TODAY,
    })
    expect(audible.leakReasons.find((r) => r.kind === 'charged_after_cancel')?.yearlyImpact).toBeCloseTo(179.4)
  })

  it('does not double count an emailed receipt for a bank charge', () => {
    const bank = monthly('SPOTIFY USA', Array(4).fill(11.99), 9)
    const email: Charge[] = bank.map((c) => ({ ...c, id: `e-${c.id}`, source: 'email', merchantKey: 'spotify', date: addDays(c.date, 1) }))
    const [sub] = detectSubscriptions({ charges: [...bank, ...email], today: TODAY })
    expect(sub.chargeCount).toBe(4)
    expect(sub.leakReasons.some((r) => r.kind === 'duplicate_charge')).toBe(false)
  })
})

describe('demo ledger', () => {
  const ledger = buildDemoLedger(TODAY)
  const subs = detectSubscriptions({ charges: ledger.charges, signals: ledger.signals, today: TODAY })
  const keys = subs.map((s) => s.merchantKey).sort()

  it('finds exactly the planted subscriptions and none of the noise', () => {
    expect(keys).toEqual(
      [
        'adobe', 'apple-music', 'audible', 'chatgpt', 'dashpass', 'google-one', 'hbo-max', 'headspace', 'hulu',
        'icloud', 'netflix', 'nordvpn', 'nytimes', 'perplexity', 'planet-fitness', 'siriusxm', 'spotify',
        'uber-one', 'verizon-wireless', 'xbox-game-pass',
      ].sort(),
    )
  })

  it('produces a dramatic but explainable total', () => {
    const total = subs.reduce((s, x) => s + x.yearlyWaste, 0)
    expect(total).toBeGreaterThan(1000)
    expect(total).toBeLessThan(2500)
    for (const s of subs) expect(s.yearlyWaste).toBeLessThanOrEqual(s.yearlyCost)
    expect(pickTeaser(subs)?.yearlyWaste).toBe(Math.max(...subs.map((s) => s.yearlyWaste)))
  })
})
