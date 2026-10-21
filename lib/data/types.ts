import type { Category, Cycle, Difficulty } from '@/lib/catalog/merchants'
import type { LeakReason } from '@/lib/detection/types'

export type Region = 'US' | 'UK' | 'EU' | 'CA' | 'AU'
export type SubStatus = 'active' | 'cancelling' | 'cancelled' | 'ignored'

export const REGIONS: { value: Region; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'EU', label: 'European Union' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
]

export interface Viewer {
  mode: 'live' | 'demo'
  id: string
  email: string
  name: string | null
  isPro: boolean
  plan: 'monthly' | 'yearly' | null
  currentPeriodEnd: string | null
  region: Region
  alertEmail: boolean
  alertSms: boolean
  phone: string | null
  hasBilling: boolean
}

export interface SubscriptionView {
  id: string
  merchantKey: string
  name: string
  domain: string | null
  category: Category
  cost: number
  currency: string
  cycle: Cycle
  nextBillingDate: string
  lastChargedAt: string | null
  firstSeenAt: string | null
  previousCost: number | null
  chargeCount: number
  confidence: number
  source: 'plaid' | 'email' | 'manual'
  status: SubStatus
  cancellationDifficulty: Difficulty
  cancellationUrl: string | null
  wasteScore: number
  yearlyCost: number
  yearlyWaste: number
  leakReasons: LeakReason[]
  duplicateGroup: string | null
  isTeaser: boolean
  history: { date: string; amount: number }[]
}

/** What a free user sees for a paywalled subscription — nothing identifying. */
export interface LockedRow {
  slot: string
  category: Category
  reasonLabel: string | null
  severity: 'high' | 'medium' | 'low' | 'none'
}

export interface ConnectionView {
  id: string
  provider: 'plaid' | 'google' | 'microsoft'
  label: string
  detail: string | null
  status: 'active' | 'error' | 'disconnected'
  lastSyncedAt: string | null
}

export interface AlertView {
  id: string
  kind: 'new_subscription' | 'price_hike' | 'renewal' | 'duplicate' | 'trial_ending' | 'charged_after_cancel'
  title: string
  body: string | null
  createdAt: string
  read: boolean
}

export interface Insight {
  id: string
  tone: 'leak' | 'save' | 'insight' | 'warn'
  title: string
  body: string
  yearly: number
}

export interface UpcomingRenewal {
  slot: string
  name: string | null
  date: string
  cost: number
  cycle: Cycle
}

export interface DashboardData {
  viewer: Viewer
  connections: ConnectionView[]
  hasData: boolean
  lastSyncedAt: string | null
  totals: {
    yearlyWaste: number
    yearlySpend: number
    monthlySpend: number
    activeCount: number
    leakCount: number
    savedYearly: number
    avgWasteScore: number
  }
  categories: { category: Category; yearly: number; waste: number }[]
  revealed: SubscriptionView[]
  locked: LockedRow[]
  upcoming: UpcomingRenewal[]
  insights: Insight[]
  alerts: AlertView[]
}
