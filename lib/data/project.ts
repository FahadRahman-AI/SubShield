import { OVERLAP_LABELS, type OverlapGroup } from '@/lib/catalog/merchants'
import { toDay } from '@/lib/dates'
import { formatMoney } from '@/lib/utils'
import type { DashboardData, Insight, LockedRow, SubscriptionView, UpcomingRenewal } from './types'

// The paywall projection. Pure and shared by live + demo mode, so what a free
// user can see is decided in exactly one place (and mirrored by RLS in the DB).

const round2 = (n: number) => Math.round(n * 100) / 100

const isLive = (s: SubscriptionView) => s.status === 'active' || s.status === 'cancelling'

function severity(s: SubscriptionView): LockedRow['severity'] {
  if (s.yearlyWaste >= 150) return 'high'
  if (s.yearlyWaste >= 40) return 'medium'
  if (s.yearlyWaste > 0) return 'low'
  return 'none'
}

export function projectDashboard(
  subs: SubscriptionView[],
  isPro: boolean,
  today: string,
): Pick<DashboardData, 'totals' | 'categories' | 'revealed' | 'locked' | 'upcoming' | 'insights'> {
  const live = subs.filter(isLive)
  const cut = subs.filter((s) => s.status === 'cancelled' || s.status === 'cancelling')
  const leaks = live.filter((s) => s.yearlyWaste > 0)
  const yearlySpend = round2(live.reduce((t, s) => t + s.yearlyCost, 0))

  const byCategory = new Map<SubscriptionView['category'], { yearly: number; waste: number }>()
  for (const s of live) {
    const c = byCategory.get(s.category) ?? { yearly: 0, waste: 0 }
    c.yearly += s.yearlyCost
    c.waste += s.yearlyWaste
    byCategory.set(s.category, c)
  }

  const ordered = [...live].sort((a, b) => b.yearlyWaste - a.yearlyWaste || b.yearlyCost - a.yearlyCost)
  const teaser = ordered.find((s) => s.isTeaser) ?? ordered.find((s) => s.yearlyWaste > 0)

  const revealed = isPro ? [...ordered, ...subs.filter((s) => !isLive(s))] : teaser ? [teaser] : []
  const locked: LockedRow[] = isPro
    ? []
    : ordered
        .filter((s) => s !== teaser)
        .map((s, i) => ({ slot: `locked-${i}`, category: s.category, reasonLabel: s.leakReasons[0]?.label ?? null, severity: severity(s) }))

  const todayDay = toDay(today)
  const upcoming: UpcomingRenewal[] = live
    .filter((s) => toDay(s.nextBillingDate) - todayDay <= 30 && toDay(s.nextBillingDate) >= todayDay)
    .sort((a, b) => toDay(a.nextBillingDate) - toDay(b.nextBillingDate))
    .map((s, i) => ({
      slot: isPro || s === teaser ? s.id : `upcoming-${i}`,
      name: isPro || s === teaser ? s.name : null,
      date: s.nextBillingDate,
      cost: s.cost,
      cycle: s.cycle,
    }))

  return {
    totals: {
      yearlyWaste: round2(leaks.reduce((t, s) => t + s.yearlyWaste, 0)),
      yearlySpend,
      monthlySpend: round2(yearlySpend / 12),
      activeCount: live.length,
      leakCount: leaks.length,
      savedYearly: round2(cut.reduce((t, s) => t + s.yearlyCost, 0)),
      avgWasteScore: live.length ? Math.round(live.reduce((t, s) => t + s.wasteScore, 0) / live.length) : 0,
    },
    categories: [...byCategory.entries()]
      .map(([category, v]) => ({ category, yearly: round2(v.yearly), waste: round2(v.waste) }))
      .sort((a, b) => b.yearly - a.yearly),
    revealed,
    locked,
    upcoming,
    insights: buildInsights(live, isPro, todayDay),
  }
}

/** Rule-based insights. Free users get the dollars and counts, not the names. */
export function buildInsights(live: SubscriptionView[], isPro: boolean, todayDay: number): Insight[] {
  const out: Insight[] = []
  const names = (list: SubscriptionView[]) => (isPro ? list.map((s) => s.name).join(', ') : `${list.length} services`)

  const groups = new Map<string, SubscriptionView[]>()
  for (const s of live) if (s.duplicateGroup) groups.set(s.duplicateGroup, [...(groups.get(s.duplicateGroup) ?? []), s])
  for (const [group, members] of groups) {
    if (members.length < 2) continue
    const savings = members.reduce((t, s) => t + (s.leakReasons.find((r) => r.kind === 'redundant')?.yearlyImpact ?? 0), 0)
    out.push({
      id: `overlap-${group}`,
      tone: 'insight',
      title: `${members.length} overlapping ${OVERLAP_LABELS[group as OverlapGroup]}`,
      body: isPro
        ? `${names(members)}. Keep one and rotate the others month to month.`
        : 'Keep one and rotate the others month to month. Upgrade to see which.',
      yearly: round2(savings),
    })
  }

  const hikes = live.filter((s) => s.leakReasons.some((r) => r.kind === 'price_hike'))
  if (hikes.length) {
    const extra = hikes.reduce((t, s) => t + (s.leakReasons.find((r) => r.kind === 'price_hike')?.yearlyImpact ?? 0), 0)
    out.push({
      id: 'hikes',
      tone: 'leak',
      title: `${hikes.length} price ${hikes.length === 1 ? 'hike' : 'hikes'} this year`,
      body: isPro ? `${names(hikes)} raised prices. Many will match the old rate if you start to cancel.` : 'Many vendors match the old rate if you start to cancel.',
      yearly: round2(extra),
    })
  }

  const zombies = live.filter((s) => s.leakReasons.some((r) => r.kind === 'charged_after_cancel'))
  if (zombies.length) {
    out.push({
      id: 'zombies',
      tone: 'leak',
      title: 'Charged after you cancelled',
      body: isPro
        ? `${names(zombies)} kept billing after a cancellation confirmation. These charges are disputable with your card issuer.`
        : 'A vendor kept billing after confirming your cancellation. That’s disputable with your card issuer.',
      yearly: round2(zombies.reduce((t, s) => t + s.yearlyCost, 0)),
    })
  }

  const week = live.filter((s) => toDay(s.nextBillingDate) - todayDay <= 7 && toDay(s.nextBillingDate) >= todayDay)
  if (week.length) {
    out.push({
      id: 'week',
      tone: 'warn',
      title: `${formatMoney(round2(week.reduce((t, s) => t + s.cost, 0)), { cents: true })} renews this week`,
      body: isPro ? `${names(week)}. Cancel now to avoid the next charge.` : `${week.length} renewals in the next 7 days. Cancel before they charge.`,
      yearly: 0,
    })
  }

  return out.sort((a, b) => b.yearly - a.yearly)
}
