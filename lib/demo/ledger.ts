import { addDays, addMonths, isoDate, toDay } from '@/lib/dates'
import type { Charge, EmailSignal } from '@/lib/detection/types'

// A deterministic 14-month ledger for demo mode, built relative to "today" so
// renewal dates are always in the future. It contains real subscription
// patterns *and* everyday noise (groceries, rides, payroll, rent) so the
// detection engine has to earn its result.

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Series {
  description: string
  account: string
  day: number
  /** Inclusive months-ago range, e.g. [13, 0] = 14 charges ending this month. */
  from: number
  to?: number
  amount: number | ((monthsAgo: number) => number)
  category?: string
}

const SERIES: Series[] = [
  { description: 'NETFLIX.COM', account: 'cc-sapphire', day: 4, from: 13, amount: (m) => (m <= 2 ? 17.99 : 15.49) },
  { description: 'HULU 877-8244858', account: 'cc-sapphire', day: 12, from: 9, amount: 18.99 },
  { description: 'HBO MAX', account: 'cc-amex', day: 21, from: 7, amount: 16.99 },
  { description: 'Spotify USA', account: 'cc-sapphire', day: 9, from: 13, amount: (m) => (m <= 5 ? 11.99 : 10.99) },
  { description: 'APPLE.COM/BILL', account: 'cc-amex', day: 17, from: 4, amount: 10.99 },
  // iCloud+ billed on two cards — two Apple IDs on the same plan.
  { description: 'APPLE.COM/BILL', account: 'cc-sapphire', day: 2, from: 13, amount: 2.99 },
  { description: 'APPLE.COM/BILL', account: 'cc-amex', day: 3, from: 5, amount: 2.99 },
  { description: 'GOOGLE *Google One', account: 'chk-chase', day: 26, from: 11, amount: 1.99 },
  { description: 'ADOBE *CREATIVE CLOUD', account: 'cc-amex', day: 14, from: 12, amount: (m) => (m <= 3 ? 59.99 : 54.99) },
  { description: 'PLANET FITNESS CLUB #0415', account: 'chk-chase', day: 17, from: 13, amount: 24.99 },
  { description: 'NYTIMES*NYTDIGITAL', account: 'cc-sapphire', day: 6, from: 13, amount: (m) => (m <= 1 ? 25.0 : 4.0) },
  { description: 'AUDIBLE*US 888-283-5051', account: 'cc-sapphire', day: 8, from: 15, amount: 14.95 },
  { description: 'DOORDASH DASHPASS', account: 'cc-amex', day: 23, from: 8, amount: 9.99 },
  { description: 'UBER ONE MEMBERSHIP', account: 'cc-sapphire', day: 6, from: 5, amount: 9.99 },
  { description: 'OPENAI *CHATGPT SUBSCR', account: 'cc-amex', day: 11, from: 9, amount: 20.0 },
  { description: 'PERPLEXITY.AI', account: 'cc-amex', day: 28, from: 3, amount: 20.0 },
  { description: 'MICROSOFT*XBOX GAME PASS', account: 'chk-chase', day: 19, from: 6, amount: 16.99 },
  { description: 'VERIZON WIRELESS PAYMENTS', account: 'chk-chase', day: 22, from: 13, amount: 85.0, category: 'RENT_AND_UTILITIES_TELEPHONE' },
]

export interface DemoLedger {
  charges: Charge[]
  signals: EmailSignal[]
  accounts: { id: string; name: string; mask: string; institution: string }[]
}

export function buildDemoLedger(todayInput: Date | string = new Date()): DemoLedger {
  const today = typeof todayInput === 'string' ? todayInput : isoDate(todayInput)
  const todayDay = toDay(today)
  const rand = mulberry32(0x5b5d)
  const charges: Charge[] = []
  let n = 0
  const push = (c: Omit<Charge, 'id' | 'source'>) => {
    if (toDay(c.date) > todayDay) return
    charges.push({ id: `demo-${++n}`, source: 'bank', currency: 'USD', connectionId: 'demo-plaid', ...c })
  }

  const monthStart = `${today.slice(0, 7)}-01`
  for (const s of SERIES) {
    for (let m = s.from; m >= (s.to ?? 0); m--) {
      const date = addMonths(monthStart, -m, s.day)
      const amount = typeof s.amount === 'function' ? s.amount(m) : s.amount
      push({ description: s.description, amount, date, accountId: s.account, category: s.category ?? null })
    }
  }

  // Yearly renewals and a promo that ended.
  push({ description: 'HEADSPACE.COM', amount: 69.99, date: addDays(today, -334), accountId: 'cc-sapphire' })
  push({ description: 'NORDVPN* NORDSEC', amount: 59.88, date: addDays(today, -392), accountId: 'cc-amex' })
  push({ description: 'NORDVPN* NORDSEC', amount: 139.08, date: addDays(today, -27), accountId: 'cc-amex' })
  push({ description: 'PLANET FIT ANNUAL FEE', amount: 49.0, date: addDays(today, -290), accountId: 'chk-chase' })

  // SiriusXM: $1 trial that quietly converted.
  push({ description: 'SIRIUSXM RADIO', amount: 1.0, date: addDays(today, -82), accountId: 'cc-sapphire' })
  push({ description: 'SIRIUSXM RADIO', amount: 10.99, date: addDays(today, -52), accountId: 'cc-sapphire' })
  push({ description: 'SIRIUSXM RADIO', amount: 10.99, date: addDays(today, -22), accountId: 'cc-sapphire' })

  // A subscription that already ended — must NOT be detected.
  for (let m = 13; m >= 6; m--) {
    push({ description: 'PELOTON* MEMBERSHIP', amount: 12.99, date: addMonths(monthStart, -m, 15), accountId: 'cc-amex' })
  }

  // Everyday noise.
  for (let d = 420; d >= 0; d--) {
    const date = addDays(today, -d)
    const r = rand()
    if (r < 0.16) push({ description: 'WHOLE FOODS MKT #10234', amount: Math.round((38 + rand() * 110) * 100) / 100, date, accountId: 'cc-sapphire', category: 'FOOD_AND_DRINK_GROCERIES' })
    else if (r < 0.3) push({ description: 'BLUE BOTTLE COFFEE', amount: Math.round((4.5 + rand() * 9) * 100) / 100, date, accountId: 'cc-amex', category: 'FOOD_AND_DRINK_COFFEE' })
    else if (r < 0.38) push({ description: 'UBER *TRIP', amount: Math.round((9 + rand() * 32) * 100) / 100, date, accountId: 'cc-sapphire', category: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES' })
    else if (r < 0.45) push({ description: 'AMAZON MKTPL*2K4L19', amount: Math.round((12 + rand() * 80) * 100) / 100, date, accountId: 'cc-amex', category: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES' })
    else if (r < 0.5) push({ description: 'DOORDASH*CHIPOTLE', amount: Math.round((16 + rand() * 22) * 100) / 100, date, accountId: 'cc-amex', category: 'FOOD_AND_DRINK_FAST_FOOD' })
    else if (r < 0.53) push({ description: 'SHELL OIL 57444', amount: Math.round((35 + rand() * 30) * 100) / 100, date, accountId: 'chk-chase', category: 'TRANSPORTATION_GAS' })
    if (d % 14 === 3) push({ description: 'ACME CORP PAYROLL', amount: -2450, date, accountId: 'chk-chase', category: 'INCOME_WAGES' })
    if (Number(date.slice(8, 10)) === 1) push({ description: 'ZELLE TO M. RIVERA RENT', amount: 2100, date, accountId: 'chk-chase', category: 'TRANSFER_OUT_ACCOUNT_TRANSFER' })
  }

  const signals: EmailSignal[] = [
    // Audible "cancelled" — but billing never stopped.
    { merchantKey: 'audible', kind: 'cancellation', date: addMonths(monthStart, -3, 10) },
    { merchantKey: 'netflix', kind: 'price_change', date: addMonths(monthStart, -3, 20) },
    { merchantKey: 'headspace', kind: 'renewal_notice', date: addDays(today, -3) },
  ]

  return {
    charges: charges.sort((a, b) => toDay(a.date) - toDay(b.date)),
    signals,
    accounts: [
      { id: 'chk-chase', name: 'Total Checking', mask: '4417', institution: 'Chase' },
      { id: 'cc-sapphire', name: 'Sapphire Preferred', mask: '9032', institution: 'Chase' },
      { id: 'cc-amex', name: 'Gold Card', mask: '1008', institution: 'American Express' },
    ],
  }
}
