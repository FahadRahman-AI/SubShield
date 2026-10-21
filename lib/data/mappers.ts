import { getMerchant, type Category } from '@/lib/catalog/merchants'
import type { DetectedSubscription, LeakReason } from '@/lib/detection/types'
import type { Tables, TablesInsert } from '@/lib/supabase/database.types'
import type { SubscriptionView, SubStatus } from './types'

export function detectedToView(d: DetectedSubscription, status: SubStatus = 'active', isTeaser = false): SubscriptionView {
  return {
    id: d.merchantKey,
    merchantKey: d.merchantKey,
    name: d.name,
    domain: d.domain,
    category: d.category,
    cost: d.cost,
    currency: d.currency,
    cycle: d.cycle,
    nextBillingDate: d.nextBillingDate,
    lastChargedAt: d.lastChargedAt,
    firstSeenAt: d.firstSeenAt,
    previousCost: d.previousCost,
    chargeCount: d.chargeCount,
    confidence: d.confidence,
    source: d.source,
    status,
    cancellationDifficulty: d.cancellationDifficulty,
    cancellationUrl: d.cancellationUrl,
    wasteScore: d.wasteScore,
    yearlyCost: d.yearlyCost,
    yearlyWaste: d.yearlyWaste,
    leakReasons: d.leakReasons,
    duplicateGroup: d.duplicateGroup,
    isTeaser,
    history: d.history,
  }
}

export function detectedToRow(d: DetectedSubscription, userId: string): TablesInsert<'subscriptions'> {
  return {
    user_id: userId,
    connection_id: d.connectionId,
    name: d.name,
    cost: d.cost,
    billing_cycle: d.cycle,
    category: d.category,
    next_billing_date: d.nextBillingDate,
    cancellation_difficulty: d.cancellationDifficulty,
    cancellation_url: d.cancellationUrl,
    merchant_key: d.merchantKey,
    domain: d.domain,
    source: d.source,
    currency: d.currency,
    previous_cost: d.previousCost,
    last_charged_at: d.lastChargedAt,
    first_seen_at: d.firstSeenAt,
    charge_count: d.chargeCount,
    confidence: d.confidence,
    waste_score: d.wasteScore,
    yearly_waste: d.yearlyWaste,
    leak_reasons: d.leakReasons as unknown as TablesInsert<'subscriptions'>['leak_reasons'],
    duplicate_group: d.duplicateGroup,
    is_teaser: false,
  }
}

const PERIODS = { weekly: 52.18, monthly: 12, yearly: 1 } as const

export function rowToView(row: Tables<'subscriptions'>, history: { date: string; amount: number }[] = []): SubscriptionView {
  const cycle = row.billing_cycle ?? 'monthly'
  const reasons = (Array.isArray(row.leak_reasons) ? row.leak_reasons : []) as unknown as LeakReason[]
  const duplicateCopies = reasons.some((r) => r.kind === 'duplicate_charge') ? 2 : 1
  return {
    id: row.id,
    merchantKey: row.merchant_key,
    name: row.name,
    domain: row.domain,
    category: (row.category ?? 'General') as Category,
    cost: Number(row.cost),
    currency: row.currency,
    cycle,
    nextBillingDate: row.next_billing_date,
    lastChargedAt: row.last_charged_at,
    firstSeenAt: row.first_seen_at,
    previousCost: row.previous_cost === null ? null : Number(row.previous_cost),
    chargeCount: row.charge_count,
    confidence: Number(row.confidence),
    source: row.source,
    status: row.status ?? 'active',
    cancellationDifficulty: row.cancellation_difficulty ?? getMerchant(row.merchant_key)?.cancel.difficulty ?? 'medium',
    cancellationUrl: row.cancellation_url,
    wasteScore: row.waste_score,
    yearlyCost: Math.round(Number(row.cost) * PERIODS[cycle] * duplicateCopies * 100) / 100,
    yearlyWaste: Number(row.yearly_waste),
    leakReasons: reasons,
    duplicateGroup: row.duplicate_group,
    isTeaser: row.is_teaser,
    history,
  }
}
