import { formatShortDate } from '@/lib/dates'
import type { Region, SubscriptionView } from '@/lib/data/types'

// Cancellation letters. References are deliberately conservative — they point
// at the consumer-protection framework without overstating what it guarantees.
// Shown to users with a "not legal advice" note.

const REGIONAL: Record<Region, { law: string; data?: string }> = {
  US: {
    law:
      'Many state automatic-renewal laws — including California’s (Business and Professions Code § 17600 et seq.) — require businesses to honor cancellation requests and provide a straightforward way to cancel. Please process this request without requiring a phone call, chat, or acceptance of a retention offer.',
  },
  UK: {
    law:
      'Under the Consumer Rights Act 2015, contract terms that make it unreasonably difficult to end a contract may be unfair and unenforceable. Please process this cancellation without requiring me to accept a retention offer or contact you through another channel.',
    data: 'I also ask that you delete my personal data, including stored payment details, once you no longer need it, in line with Article 17 of the UK GDPR.',
  },
  EU: {
    law:
      'Under EU consumer protection law, including Directive 2011/83/EU on consumer rights and Directive 93/13/EEC on unfair contract terms, I am entitled to end this contract without undue obstacles. Please process this request without requiring a retention conversation.',
    data: 'I also ask that you erase my personal data, including stored payment details, once it is no longer necessary, under Article 17 GDPR.',
  },
  CA: {
    law:
      'Provincial consumer protection legislation entitles me to cancel this agreement and requires that cancellation be honored without unreasonable conditions. Please process this request without requiring a retention call.',
  },
  AU: {
    law:
      'Under the Australian Consumer Law, terms that make it unreasonably difficult to cancel may be unfair. Please process this cancellation without requiring me to accept a retention offer.',
  },
}

const CYCLE = { weekly: 'week', monthly: 'month', yearly: 'year' } as const

export interface LetterInput {
  sub: Pick<SubscriptionView, 'name' | 'cost' | 'cycle' | 'lastChargedAt' | 'leakReasons'>
  user: { name: string; email: string }
  region: Region
  method: 'email' | 'letter'
  today: string
}

export function buildCancellationLetter({ sub, user, region, method, today }: LetterInput): { subject: string; body: string } {
  const regional = REGIONAL[region]
  const zombie = sub.leakReasons.find((r) => r.kind === 'charged_after_cancel')
  const subject = `Cancellation request — ${sub.name} subscription (${user.email})`

  const requests = [
    'Cancel my subscription and stop all future billing, including any automatic renewal.',
    'Confirm the cancellation in writing by reply to this message, including the effective date.',
    zombie
      ? `Refund the charges made after my earlier cancellation. ${zombie.detail}`
      : 'Do not substitute a pause, downgrade or discounted plan for this cancellation.',
  ]

  const header =
    method === 'letter'
      ? `${user.name}\n[Your street address]\n[City, postcode]\n\n${formatShortDate(today)}, ${today.slice(0, 4)}\n\n${sub.name} — Customer Support\n[Vendor mailing address]\n\nSent by certified mail with return receipt\n\n`
      : ''

  const body = [
    `${header}To ${sub.name} Customer Support,`,
    `I am writing to cancel my ${sub.name} subscription, effective immediately.`,
    [
      'Account details',
      `• Name: ${user.name}`,
      `• Account email: ${user.email}`,
      `• Plan: $${sub.cost.toFixed(2)} per ${CYCLE[sub.cycle]}${sub.lastChargedAt ? `, last charged ${formatShortDate(sub.lastChargedAt)}` : ''}`,
    ].join('\n'),
    ['Please:', ...requests.map((r, i) => `${i + 1}. ${r}`)].join('\n'),
    regional.law,
    ...(regional.data ? [regional.data] : []),
    'Please treat this message as withdrawal of my authorization for any further recurring charges to my payment method. If charges continue after today, I will dispute them with my card issuer and provide this request as evidence.',
    `Kind regards,\n${user.name}\n${user.email}`,
  ].join('\n\n')

  return { subject, body }
}
