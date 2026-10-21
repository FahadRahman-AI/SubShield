import type { Category, Cycle, Difficulty, OverlapGroup } from '@/lib/catalog/merchants'

/** One observed charge — a bank transaction or an emailed receipt. */
export interface Charge {
  id: string
  source: 'bank' | 'email'
  description: string
  merchantName?: string | null
  website?: string | null
  /** Positive = money out (Plaid convention). */
  amount: number
  currency?: string
  /** YYYY-MM-DD */
  date: string
  accountId?: string | null
  connectionId?: string | null
  /** Plaid personal_finance_category.detailed, when available. */
  category?: string | null
  /** Pre-resolved merchant (email parser already knows it). */
  merchantKey?: string
}

export type EmailSignalKind = 'receipt' | 'renewal_notice' | 'price_change' | 'trial_ending' | 'cancellation'

export interface EmailSignal {
  merchantKey: string
  kind: EmailSignalKind
  amount?: number | null
  /** YYYY-MM-DD */
  date: string
}

export type LeakKind =
  | 'duplicate_charge'
  | 'charged_after_cancel'
  | 'redundant'
  | 'price_hike'
  | 'trial_conversion'
  | 'forgotten'

export interface LeakReason {
  kind: LeakKind
  label: string
  detail: string
  /** Projected yearly money lost to this reason. 0 for informational signals. */
  yearlyImpact: number
}

export interface DetectedSubscription {
  merchantKey: string
  name: string
  domain: string | null
  category: Category
  cost: number
  currency: string
  cycle: Cycle
  nextBillingDate: string
  lastChargedAt: string
  firstSeenAt: string
  chargeCount: number
  previousCost: number | null
  confidence: number
  source: 'plaid' | 'email'
  connectionId: string | null
  cancellationDifficulty: Difficulty
  cancellationUrl: string | null
  overlap: OverlapGroup | null
  /** 0..1 probability the subscription is going unused. */
  dormancy: number
  /** 0..100 — the Waste Index shown in the UI. */
  wasteScore: number
  yearlyCost: number
  yearlyWaste: number
  leakReasons: LeakReason[]
  duplicateGroup: string | null
  history: { date: string; amount: number }[]
}
