import { CATEGORY_DORMANCY, OVERLAP_LABELS, type Cycle } from '@/lib/catalog/merchants'
import { addDays, addMonths, formatMonth, formatShortDate, isoDate, toDay } from '@/lib/dates'
import { resolveMerchant, type ResolvedMerchant } from './normalize'
import { findOverlaps } from './overlap'
import type { Charge, DetectedSubscription, EmailSignal, LeakReason } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Recurring-charge & leak engine
//
//  1. Resolve every charge to a merchant (catalog first, descriptor fallback).
//  2. Drop emailed receipts that duplicate a bank charge.
//  3. Per merchant, cluster charges by amount (25% band, so price hikes stay in
//     the same series while e.g. two different Apple plans split apart).
//  4. Per cluster: strip same-cycle duplicates, classify the cycle from the
//     median interval, score regularity + amount stability → confidence.
//  5. Attach leak reasons: duplicates, charges after a cancellation email,
//     price hikes, trial conversions, likely-unused (dormancy), and — across
//     subscriptions — redundant services in the same overlap group.
// ─────────────────────────────────────────────────────────────────────────────

const NOMINAL_DAYS: Record<Cycle, number> = { weekly: 7, monthly: 30.44, yearly: 365.25 }
const TOLERANCE_DAYS: Record<Cycle, number> = { weekly: 2, monthly: 5, yearly: 20 }
export const PERIODS_PER_YEAR: Record<Cycle, number> = { weekly: 52.18, monthly: 12, yearly: 1 }
const CYCLE_SHORT: Record<Cycle, string> = { weekly: 'wk', monthly: 'mo', yearly: 'yr' }

const CLUSTER_BAND = 0.25
/** Charges at or below this are trial / card-verification charges. */
const TRIAL_MAX = 1.99
const MIN_CONFIDENCE = 0.6
const MIN_CONFIDENCE_KNOWN = 0.5

const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))
const money = (n: number) => `$${n.toFixed(2)}`

function median(values: number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function classifyCycle(medianDays: number): Cycle | null {
  if (medianDays >= 5 && medianDays <= 9) return 'weekly'
  if (medianDays >= 25 && medianDays <= 36) return 'monthly'
  if (medianDays >= 340 && medianDays <= 390) return 'yearly'
  return null
}

export function annualize(cost: number, cycle: Cycle): number {
  return round2(cost * PERIODS_PER_YEAR[cycle])
}

function nextBilling(last: string, cycle: Cycle, anchorDay: number, today: string): string {
  const step = (d: string) =>
    cycle === 'weekly' ? addDays(d, 7) : cycle === 'monthly' ? addMonths(d, 1, anchorDay) : addMonths(d, 12, anchorDay)
  let next = step(last)
  while (toDay(next) < toDay(today)) next = step(next)
  return next
}

interface ResolvedCharge extends Charge {
  merchant: ResolvedMerchant
}

interface Cluster {
  merchant: ResolvedMerchant
  charges: ResolvedCharge[]
}

function clusterByAmount(charges: ResolvedCharge[]): ResolvedCharge[][] {
  const clusters: ResolvedCharge[][] = []
  for (const c of [...charges].sort((a, b) => toDay(a.date) - toDay(b.date))) {
    let best: { cluster: ResolvedCharge[]; gap: number } | undefined
    for (const cluster of clusters) {
      const last = cluster[cluster.length - 1].amount
      const gap = Math.abs(c.amount - last) / Math.max(c.amount, last)
      if (gap <= CLUSTER_BAND && (!best || gap < best.gap)) best = { cluster, gap }
    }
    if (best) best.cluster.push(c)
    else clusters.push([c])
  }
  return clusters
}

export interface DetectOptions {
  charges: Charge[]
  signals?: EmailSignal[]
  today?: Date | string
}

export function detectSubscriptions({ charges, signals = [], today: todayInput }: DetectOptions): DetectedSubscription[] {
  const today = typeof todayInput === 'string' ? todayInput : isoDate(todayInput ?? new Date())
  const todayDay = toDay(today)

  // 1. Resolve merchants.
  const resolved: ResolvedCharge[] = []
  for (const charge of charges) {
    if (!(charge.amount > 0)) continue
    const merchant = resolveMerchant({ ...charge })
    if (merchant) resolved.push({ ...charge, merchant })
  }

  // 2. Bank charges win over emailed receipts for the same payment.
  const bank = resolved.filter((c) => c.source === 'bank')
  const deduped = resolved.filter(
    (c) =>
      c.source === 'bank' ||
      !bank.some(
        (b) =>
          b.merchant.key === c.merchant.key &&
          Math.abs(b.amount - c.amount) <= Math.max(0.5, b.amount * 0.02) &&
          Math.abs(toDay(b.date) - toDay(c.date)) <= 3,
      ),
  )

  // 3. Group by merchant, then cluster by amount.
  const byMerchant = new Map<string, ResolvedCharge[]>()
  for (const c of deduped) {
    const list = byMerchant.get(c.merchant.key) ?? []
    list.push(c)
    byMerchant.set(c.merchant.key, list)
  }

  const signalsByMerchant = new Map<string, EmailSignal[]>()
  for (const s of signals) {
    const list = signalsByMerchant.get(s.merchantKey) ?? []
    list.push(s)
    signalsByMerchant.set(s.merchantKey, list)
  }

  const results: DetectedSubscription[] = []

  for (const [key, merchantCharges] of byMerchant) {
    const clusters: Cluster[] = clusterByAmount(merchantCharges)
      .map((charges) => ({ merchant: charges[0].merchant, charges }))
      // Tiny trial/verification charges never form a subscription on their own.
      .filter((cl) => cl.charges.length > 1 || cl.charges[0].amount >= 2)

    const merchantSignals = signalsByMerchant.get(key) ?? []
    const analyzed = clusters
      .map((cl) => analyzeCluster(cl, merchantCharges, merchantSignals, today, todayDay))
      .filter((d): d is DetectedSubscription => d !== null)

    // A price tier that stopped right when a newer tier began was replaced, not kept.
    const detected = analyzed.filter(
      (a) =>
        !analyzed.some((b) => {
          if (b === a) return false
          const gap = toDay(b.history[0].date) - toDay(a.lastChargedAt)
          return gap > 0 && gap <= NOMINAL_DAYS[a.cycle] * 1.5 + TOLERANCE_DAYS[a.cycle]
        }),
    )

    // Distinct plans from the same merchant need distinct keys.
    if (detected.length > 1) {
      for (const d of detected) {
        d.merchantKey = `${key}-${Math.round(d.cost)}`
        d.name = `${d.name} · ${money(d.cost)}`
      }
    }
    results.push(...detected)
  }

  applyRedundancy(results)

  for (const sub of results) finalize(sub)

  return results.sort((a, b) => b.yearlyWaste - a.yearlyWaste || b.yearlyCost - a.yearlyCost)
}

function analyzeCluster(
  cluster: Cluster,
  allMerchantCharges: ResolvedCharge[],
  signals: EmailSignal[],
  today: string,
  todayDay: number,
): DetectedSubscription | null {
  const { merchant } = cluster
  const known = merchant.merchant
  const charges = cluster.charges
  const days = charges.map((c) => toDay(c.date))

  // Estimate the nominal interval from gaps that aren't same-cycle duplicates.
  const rawIntervals = days.slice(1).map((d, i) => d - days[i])
  const nominalGuess = median(rawIntervals.filter((g) => g >= 4)) || (known ? NOMINAL_DAYS[known.defaultCycle] : 0)

  // 4a. Split off duplicates: charges landing well inside one cycle of the previous one.
  const primary: ResolvedCharge[] = []
  const duplicates: ResolvedCharge[] = []
  for (const c of charges) {
    const prev = primary[primary.length - 1]
    if (prev && nominalGuess && toDay(c.date) - toDay(prev.date) < nominalGuess * 0.4) duplicates.push(c)
    else primary.push(c)
  }

  const primaryDays = primary.map((c) => toDay(c.date))
  const intervals = primaryDays.slice(1).map((d, i) => d - primaryDays[i])
  const emailEvidence = signals.some((s) => s.kind === 'receipt' || s.kind === 'renewal_notice')

  // 4b. Cycle + confidence.
  let cycle: Cycle | null
  let confidence: number
  if (primary.length === 1) {
    if (!known) return null
    cycle = known.defaultCycle
    confidence = 0.55 + (emailEvidence ? 0.15 : 0)
  } else {
    cycle = classifyCycle(median(intervals))
    if (!cycle) return null
    const nominal = NOMINAL_DAYS[cycle]
    const tol = TOLERANCE_DAYS[cycle]
    const regularity = intervals.filter((g) => Math.abs(g - nominal) <= tol).length / intervals.length
    // Unknown merchants need a real pattern — two lookalike purchases aren't one.
    if (!known && (primary.length < 3 || regularity < 0.7)) return null
    const recent = primary.slice(-6).map((c) => c.amount)
    const mean = recent.reduce((s, a) => s + a, 0) / recent.length
    const sd = Math.sqrt(recent.reduce((s, a) => s + (a - mean) ** 2, 0) / recent.length)
    const stability = 1 - clamp(sd / mean)
    confidence =
      0.45 * regularity + 0.2 * stability + 0.15 * (Math.min(primary.length, 6) / 6) + (known ? 0.2 : 0) + (emailEvidence ? 0.1 : 0)
  }
  confidence = round2(clamp(confidence, 0, 0.99))
  if (confidence < (known ? MIN_CONFIDENCE_KNOWN : MIN_CONFIDENCE)) return null

  // Still active? A missed cycle (plus tolerance) means it already stopped.
  const last = primary[primary.length - 1]
  const sinceLast = todayDay - toDay(last.date)
  if (sinceLast > NOMINAL_DAYS[cycle] * 1.5 + TOLERANCE_DAYS[cycle]) return null

  const cost = round2(last.amount)
  const anchorDay = Number(primary[0].date.slice(8, 10))
  const copies = 1 + (duplicates.length && toDay(duplicates[duplicates.length - 1].date) >= toDay(last.date) - NOMINAL_DAYS[cycle] * 1.5 ? 1 : 0)
  const yearlyCost = round2(annualize(cost, cycle) * copies)
  const reasons: LeakReason[] = []

  // Duplicate billing still happening in the latest cycle.
  if (copies > 1) {
    reasons.push({
      kind: 'duplicate_charge',
      label: 'Billed twice',
      detail: `Charged twice per cycle (${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''}) — likely two accounts for the same service.`,
      yearlyImpact: annualize(cost, cycle),
    })
  }

  // Charges that continued after a cancellation email.
  const cancellation = signals.filter((s) => s.kind === 'cancellation').sort((a, b) => toDay(b.date) - toDay(a.date))[0]
  if (cancellation) {
    const after = primary.filter((c) => toDay(c.date) > toDay(cancellation.date) + 3)
    if (after.length) {
      reasons.push({
        kind: 'charged_after_cancel',
        label: 'Charged after cancelling',
        detail: `You got a cancellation confirmation on ${formatShortDate(cancellation.date)} — and have been charged ${after.length}× since (${money(after.reduce((s, c) => s + c.amount, 0))}).`,
        yearlyImpact: annualize(cost, cycle),
      })
    }
  }

  // Price hike: the most recent change in the amount series. A jump too big to
  // stay in one cluster (intro rate ending) shows up as the merchant's previous
  // non-trial charge just before this series began.
  let previousCost: number | null = null
  let hikeDate: string | null = null
  for (let i = primary.length - 2; i >= 0; i--) {
    if (Math.abs(primary[i].amount - cost) > Math.max(0.25, cost * 0.015)) {
      previousCost = round2(primary[i].amount)
      hikeDate = primary[i + 1].date
      break
    }
  }
  const firstPaid = toDay(primary[0].date)
  if (previousCost === null) {
    const window = NOMINAL_DAYS[cycle] * 1.5 + TOLERANCE_DAYS[cycle]
    const before = allMerchantCharges
      .filter((c) => c.amount > TRIAL_MAX && toDay(c.date) < firstPaid && firstPaid - toDay(c.date) <= window && !charges.includes(c))
      .sort((a, b) => toDay(b.date) - toDay(a.date))[0]
    if (before) {
      previousCost = round2(before.amount)
      hikeDate = primary[0].date
    }
  }
  if (previousCost !== null && hikeDate && cost > previousCost && todayDay - toDay(hikeDate) <= 365) {
    const delta = round2(cost - previousCost)
    const pct = Math.round((delta / previousCost) * 100)
    reasons.push({
      kind: 'price_hike',
      label: `Price up ${pct}%`,
      detail:
        pct >= 50
          ? `Promo pricing ended: ${money(previousCost)} → ${money(cost)}/${CYCLE_SHORT[cycle]} since ${formatMonth(hikeDate)}.`
          : `Went from ${money(previousCost)} to ${money(cost)}/${CYCLE_SHORT[cycle]} in ${formatMonth(hikeDate)}.`,
      yearlyImpact: round2(delta * PERIODS_PER_YEAR[cycle] * copies),
    })
  }

  // Trial conversion: a tiny charge (or trial-ending email) just before paid billing began.
  const trialCharge = allMerchantCharges.find(
    (c) => c.amount <= TRIAL_MAX && firstPaid - toDay(c.date) > 0 && firstPaid - toDay(c.date) <= 45,
  )
  const trialEmail = signals.find((s) => s.kind === 'trial_ending' && Math.abs(toDay(s.date) - firstPaid) <= 14)
  const trialConverted = Boolean((trialCharge || trialEmail) && todayDay - firstPaid <= 120)
  if (trialConverted) {
    reasons.push({
      kind: 'trial_conversion',
      label: 'Trial auto-converted',
      detail: `A trial turned into a paid plan on ${formatShortDate(primary[0].date)}.`,
      yearlyImpact: 0,
    })
  }

  // Dormancy — how likely this is going unused.
  const category = merchant.category
  const difficulty = known?.cancel.difficulty ?? 'medium'
  const tenureDays = todayDay - toDay(charges[0].date)
  let dormancy = CATEGORY_DORMANCY[category]
  if (tenureDays >= 365) dormancy += 0.1
  else if (tenureDays < 60 && !trialConverted) dormancy -= 0.1
  if (cost < 10) dormancy += 0.08
  if (cycle === 'yearly') dormancy += 0.08
  if (difficulty === 'nightmare') dormancy += 0.08
  if (trialConverted) dormancy = Math.max(dormancy, 0.7)
  dormancy = round2(clamp(dormancy, 0.02, 0.9))

  return {
    merchantKey: merchant.key,
    name: merchant.name,
    domain: merchant.domain,
    category,
    cost,
    currency: last.currency ?? 'USD',
    cycle,
    nextBillingDate: nextBilling(last.date, cycle, anchorDay, today),
    lastChargedAt: last.date,
    firstSeenAt: charges[0].date,
    chargeCount: charges.length,
    previousCost,
    confidence,
    source: primary.some((c) => c.source === 'bank') ? 'plaid' : 'email',
    connectionId: last.connectionId ?? null,
    cancellationDifficulty: difficulty,
    cancellationUrl: known?.cancel.url || null,
    overlap: known?.overlap ?? null,
    dormancy,
    wasteScore: 0,
    yearlyCost,
    yearlyWaste: 0,
    leakReasons: reasons,
    duplicateGroup: null,
    history: primary.map((c) => ({ date: c.date, amount: round2(c.amount) })),
  }
}

/** Flag every service in an overlap group except the most expensive one. */
function applyRedundancy(subs: DetectedSubscription[]) {
  for (const set of findOverlaps(subs, (s) => s.overlap, (s) => s.yearlyCost)) {
    const label = OVERLAP_LABELS[set.group]
    for (const s of set.members) s.duplicateGroup = set.group
    for (const s of set.redundant) {
      const others = set.members.filter((m) => m !== s).map((m) => m.name)
      s.leakReasons.push({
        kind: 'redundant',
        label: 'Redundant service',
        detail: `You pay for ${set.members.length} ${label}. You also have ${others.join(' and ')}.`,
        yearlyImpact: s.yearlyCost,
      })
    }
  }
}

const FULL_COST_KINDS = new Set(['redundant', 'charged_after_cancel'])

function finalize(sub: DetectedSubscription) {
  const hasFullCost = sub.leakReasons.some((r) => FULL_COST_KINDS.has(r.kind))
  if (!hasFullCost && sub.dormancy >= 0.55) {
    sub.leakReasons.push({
      kind: 'forgotten',
      label: 'Likely unused',
      detail: dormancyDetail(sub),
      yearlyImpact: round2(sub.yearlyCost * sub.dormancy),
    })
  }
  const impact = sub.leakReasons.reduce((s, r) => s + r.yearlyImpact, 0)
  sub.yearlyWaste = round2(Math.min(sub.yearlyCost, impact))
  sub.wasteScore = Math.round(100 * clamp(Math.max(sub.dormancy, sub.yearlyCost ? sub.yearlyWaste / sub.yearlyCost : 0), 0, 0.99))
}

function dormancyDetail(sub: DetectedSubscription): string {
  if (sub.leakReasons.some((r) => r.kind === 'trial_conversion')) return 'Trials that convert on their own are the most common forgotten subscription.'
  if (sub.category === 'Fitness') return 'Gym and fitness memberships are the most-unused subscriptions — check when you last went.'
  if (sub.cancellationDifficulty === 'nightmare') return 'This one is hard to cancel, so people tend to give up and keep paying.'
  if (sub.cycle === 'yearly') return 'Annual renewals are easy to forget until they hit your card.'
  return `Billing for ${Math.max(1, Math.round(sub.chargeCount))} cycles with no change — worth checking if you still use it.`
}

/** The free-tier reveal: the single most expensive leak. */
export function pickTeaser<T extends { yearlyWaste: number }>(subs: T[]): T | undefined {
  return [...subs].filter((s) => s.yearlyWaste > 0).sort((a, b) => b.yearlyWaste - a.yearlyWaste)[0]
}
