export const PRICING = {
  monthly: { amount: 9, label: '$9', per: '/month' },
  yearly: { amount: 59, label: '$59', per: '/year', monthlyEquivalent: 4.92 },
} as const

export const YEARLY_SAVINGS_PCT = Math.round((1 - PRICING.yearly.amount / (PRICING.monthly.amount * 12)) * 100)

export const FREE_FEATURES = [
  'Bank + inbox scan',
  'Total yearly waste, by category',
  'Your single biggest leak, fully revealed',
  'Dark-pattern cancellation library',
]

export const PRO_FEATURES = [
  'Every leak revealed, with the reason and the dollars',
  'One-click cancellation letters, sent for you',
  'Live monitoring for new subscriptions & price hikes',
  'Renewal alerts 3 days before you’re charged (email + SMS)',
  'Charged-after-cancel and duplicate-billing detection',
  'Region-aware consumer-rights templates',
]
