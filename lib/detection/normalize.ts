import { getMerchant, MERCHANTS, type Category, type Merchant } from '@/lib/catalog/merchants'

// Payment-processor prefixes that hide the real merchant ("SQ *", "PAYPAL *"…).
const PROCESSOR_PREFIX = /^(?:(?:sq|tst|pp|paypal|sp|py|ddr|dd|bt|pos|ach|debit|recurring|purchase|checkcard|google)\s*\*\s*)+/

const STOPWORDS = new Set([
  'inc', 'llc', 'ltd', 'co', 'com', 'www', 'net', 'org', 'corp', 'the', 'and', 'of',
  'payment', 'payments', 'subscription', 'subscriptions', 'bill', 'billing', 'recurring',
  'autopay', 'monthly', 'annual', 'membership', 'online', 'purchase', 'debit', 'card',
  'us', 'usa', 'ca', 'uk', 'help', 'http', 'https',
])

// Descriptors that are never consumer subscriptions.
const NON_SUBSCRIPTION = /\b(transfer|payroll|zelle|venmo|cash app|atm|deposit|interest|rent|mortgage|loan|tax|irs|credit card payment|payment thank you|autopay payment|withdrawal|refund)\b/
// Everyday spend that recurs naturally (groceries, coffee, fuel, rides) is not a
// subscription even when it looks periodic. Only applied to unknown merchants.
const NON_SUBSCRIPTION_CATEGORY =
  /^(TRANSFER_|LOAN_PAYMENTS|INCOME|BANK_FEES|RENT_AND_UTILITIES_RENT|GOVERNMENT_AND_NON_PROFIT|TRANSPORTATION_|TRAVEL_|FOOD_AND_DRINK_(GROCERIES|RESTAURANT|COFFEE|FAST_FOOD|BEER_WINE_AND_LIQUOR)|GENERAL_MERCHANDISE_SUPERSTORES)/

export function normalizeDescriptor(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .toLowerCase()
    .replace(PROCESSOR_PREFIX, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface ResolvedMerchant {
  key: string
  name: string
  domain: string | null
  category: Category
  merchant?: Merchant
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

function fallbackKey(text: string): string {
  const tokens = text.split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
  return tokens.slice(0, 3).join('-')
}

function categoryFromPlaid(detailed: string | null | undefined): Category {
  if (!detailed) return 'General'
  if (detailed.includes('GYMS_AND_FITNESS')) return 'Fitness'
  if (detailed.includes('TV_AND_MOVIES')) return 'Streaming'
  if (detailed.includes('MUSIC_AND_AUDIO')) return 'Music'
  if (detailed.includes('VIDEO_GAMES')) return 'Gaming'
  if (detailed.startsWith('RENT_AND_UTILITIES') || detailed.includes('TELEPHONE') || detailed.includes('INTERNET')) return 'Telecom'
  if (detailed.startsWith('FOOD_AND_DRINK')) return 'Food Delivery'
  if (detailed.startsWith('GENERAL_MERCHANDISE')) return 'Shopping'
  if (detailed.startsWith('PERSONAL_CARE') || detailed.startsWith('MEDICAL')) return 'Wellness'
  return 'General'
}

export function isNonSubscription(text: string, plaidCategory?: string | null): boolean {
  if (plaidCategory && NON_SUBSCRIPTION_CATEGORY.test(plaidCategory)) return true
  return NON_SUBSCRIPTION.test(text)
}

/** Match a descriptor against the catalog; disambiguate shared descriptors by price. */
export function matchCatalog(text: string, amount?: number): Merchant | undefined {
  const hits = MERCHANTS.filter((m) => m.aliases.some((re) => re.test(text)))
  if (hits.length <= 1) return hits[0]

  const priced = hits.filter((m) => m.pricePoints?.length)
  if (priced.length && amount !== undefined) {
    let best: { m: Merchant; gap: number } | undefined
    for (const m of priced) {
      for (const p of m.pricePoints!) {
        const gap = Math.abs(p - amount) / p
        if (!best || gap < best.gap) best = { m, gap }
      }
    }
    if (best && best.gap <= 0.15) return best.m
    // Every candidate shares an ambiguous descriptor and none fits the price.
    if (priced.length === hits.length) return undefined
  }
  // Prefer the most specific alias (longest matching source) over generic ones.
  return hits
    .map((m) => ({ m, len: Math.max(...m.aliases.filter((re) => re.test(text)).map((re) => re.source.length)) }))
    .sort((a, b) => b.len - a.len)[0].m
}

export function resolveMerchant(input: {
  description: string
  merchantName?: string | null
  website?: string | null
  amount?: number
  category?: string | null
  merchantKey?: string
}): ResolvedMerchant | null {
  if (input.merchantKey) {
    const known = getMerchant(input.merchantKey)
    if (known) return { key: known.key, name: known.name, domain: known.domain, category: known.category, merchant: known }
  }

  const text = [normalizeDescriptor(input.merchantName), normalizeDescriptor(input.description), normalizeDescriptor(input.website)]
    .filter(Boolean)
    .join(' ')

  const known = matchCatalog(text, input.amount)
  if (known) return { key: known.key, name: known.name, domain: known.domain, category: known.category, merchant: known }

  // Shared Apple descriptor that didn't match a price point.
  if (/\bapple com bill\b/.test(text)) {
    return { key: 'apple-other', name: 'Apple subscription', domain: 'apple.com', category: 'Software' }
  }

  if (isNonSubscription(text, input.category)) return null

  const base = normalizeDescriptor(input.merchantName) || normalizeDescriptor(input.description)
  const key = fallbackKey(base)
  if (!key) return null
  const name = input.merchantName?.trim() || titleCase(key.replace(/-/g, ' '))
  const domain = input.website ? input.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : null
  return { key, name, domain, category: categoryFromPlaid(input.category) }
}
