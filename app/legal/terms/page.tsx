import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/legal/legal-page'
import { LEGAL, MINIMUM_AGE, RENEWAL_REMINDER_DAYS } from '@/lib/legal'
import { PRICING } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Terms of Service' }

// Draft consumer terms (England & Wales). Have them reviewed by a solicitor.

const sections: LegalSection[] = [
  {
    id: 'about',
    title: 'About these terms',
    body: (
      <p>
        These terms are an agreement between you and {LEGAL.companyName} (“we”, “us”), company number {LEGAL.companyNumber}, {LEGAL.registeredAddress}. By
        creating an account you accept them. Our <Link href="/legal/privacy">Privacy Policy</Link> explains how we handle your data.
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who can use SubShield',
    body: (
      <p>
        You must be at least {MINIMUM_AGE} and use SubShield for your own personal finances. Bank connections are currently available for US bank accounts
        only.
      </p>
    ),
  },
  {
    id: 'service',
    title: 'What SubShield does',
    body: (
      <>
        <p>
          SubShield reads transaction data you connect, identifies charges that look recurring, and highlights ones that may be wasting money — for example price
          rises, duplicate billing or overlapping services.
        </p>
        <p>
          <strong>Our figures are estimates.</strong> They come from automated analysis of your transactions and can be wrong — a charge might be misidentified or
          a “leak” might be something you value. Check before acting on them. SubShield is not financial, legal or tax advice, and we are not a bank or a
          financial adviser.
        </p>
      </>
    ),
  },
  {
    id: 'connections',
    title: 'Bank and inbox connections',
    body: (
      <p>
        Bank connections are provided by Plaid and mailbox connections by Google or Microsoft, under their own terms. Access is read-only: we cannot move money
        or send email from your account. You can disconnect at any time from the Connections page, which deletes the data imported from that connection.
      </p>
    ),
  },
  {
    id: 'cancellations',
    title: 'Cancellation requests we send for you',
    body: (
      <>
        <p>
          When you tick the authorisation box and press send, you instruct us to email that cancellation request, in the wording you approved, to the address
          you entered. We act only as your messenger for that one request: we send it from our own address, copy you in, and set replies to go to you.
        </p>
        <ul>
          <li>We do not guarantee that a company will accept or act on a request — some insist on their own cancellation process.</li>
          <li>You are responsible for the recipient address and for the content you approve being accurate.</li>
          <li>Check that the cancellation has taken effect, and keep the company’s confirmation.</li>
        </ul>
        <p>We send a limited number of requests per day to prevent misuse, and may refuse requests that look abusive.</p>
      </>
    ),
  },
  {
    id: 'pro',
    title: 'SubShield Pro',
    body: (
      <>
        <p>
          Pro costs {PRICING.monthly.label} a month or {PRICING.yearly.label} a year, as shown before you pay, and is billed in advance by Stripe.
        </p>
        <ul>
          <li>
            <strong>It renews automatically</strong> at the end of each month or year at the then-current price until you cancel. We will tell you before any
            price change.
          </li>
          <li>
            <strong>Yearly plans:</strong> we email you {RENEWAL_REMINDER_DAYS} days before renewal with the date and price.
          </li>
          <li>
            <strong>Cancel any time</strong> in one click from Plan &amp; alerts → Manage billing. Pro then stays active until the end of the period you have paid
            for, and you will not be charged again. There is no retention process.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cooling-off',
    title: 'Your 14-day right to cancel (UK customers)',
    body: (
      <>
        <p>
          If you are a consumer in the UK, you can cancel a new Pro purchase within 14 days of buying it, for any reason, by emailing{' '}
          <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> or cancelling in Plan &amp; alerts and asking for a refund.
        </p>
        <p>
          Pro starts as soon as you pay because you ask us to start straight away. If you cancel within the 14 days, we refund what you paid minus a fair
          amount for the days you used it. Your other legal rights as a consumer are unaffected.
        </p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'Acceptable use',
    body: (
      <ul>
        <li>Only connect accounts you are entitled to access.</li>
        <li>Don’t use SubShield to send messages that are false, harassing, or sent without the account holder’s authority.</li>
        <li>Don’t try to break, overload, reverse-engineer or get around the security of the service.</li>
      </ul>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your account',
    body: (
      <p>
        You can delete your account at any time from Plan &amp; alerts → Your data. Deleting it cancels any Pro subscription, disconnects your banks and
        mailboxes, and erases your data as described in the Privacy Policy. We may suspend accounts that break these terms; where reasonable we will warn you
        first.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Our responsibility to you',
    body: (
      <>
        <p>
          We provide SubShield with reasonable care and skill. We are not responsible for losses caused by companies you subscribe to, by banks or data
          providers, by decisions you make based on our estimates, or for losses that were not foreseeable.
        </p>
        <p>
          Apart from that, our total liability to you is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits
          liability for death or personal injury caused by negligence, for fraud, or anything else the law does not allow us to limit.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to the service or these terms',
    body: (
      <p>
        We may update SubShield and these terms. If a change materially affects you, we will email you at least 30 days before it takes effect, and you can cancel
        before then.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Law and disputes',
    body: (
      <p>
        These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you live elsewhere in the UK or
        abroad, you keep any mandatory consumer protections and the right to bring a claim where you live. Please contact{' '}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> first — most problems can be fixed quickly.
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={<p>The plain-English rules for using SubShield: what we do, what we don’t promise, how Pro billing works and how to leave.</p>}
      sections={sections}
    />
  )
}
