import type { Metadata } from 'next'
import { LegalPage, type LegalSection } from '@/components/legal/legal-page'
import { LEGAL, MINIMUM_AGE } from '@/lib/legal'

export const metadata: Metadata = { title: 'Privacy Policy' }

// Draft privacy notice (UK GDPR Articles 13–14). Have it reviewed by a solicitor.

const PROCESSORS: [string, string, string][] = [
  ['Plaid', 'Connects to your bank and passes us your transaction history (read-only)', 'United States'],
  ['Supabase', 'Database and sign-in', 'United States / EU (depends on project region)'],
  ['Vercel', 'Hosts the website and app', 'United States'],
  ['Stripe', 'Takes payments for Pro. We never see your full card number', 'United States / Ireland'],
  ['Resend', 'Sends emails: sign-in links, alerts and cancellation requests you ask us to send', 'United States'],
  ['Google / Microsoft', 'Only if you connect Gmail or Outlook: reads receipt-type message details', 'United States'],
  ['Sentry', 'Error reports, stripped of request contents and personal details', 'United States'],
  ['PostHog', 'Cookieless, aggregate usage statistics', 'United States / EU (depends on project region)'],
  ['Twilio', 'Only if you turn on SMS alerts', 'United States'],
]

const sections: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>
          SubShield is run by {LEGAL.companyName} (company number {LEGAL.companyNumber}), {LEGAL.registeredAddress}. We are the “controller” of your personal data,
          which means we decide how and why it is used. We are registered with the UK Information Commissioner’s Office (registration {LEGAL.icoRegistration}).
        </p>
        <p>
          Questions about your data: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'what',
    title: 'What we collect',
    body: (
      <ul>
        <li>
          <strong>Account details</strong> — your email address, name if you give it, region and alert preferences.
        </li>
        <li>
          <strong>Bank transaction data</strong> — when you connect a bank or card through Plaid: merchant names, descriptions, amounts, dates and categories of
          transactions for up to 24 months, plus the name of your bank. We do not receive your bank login details and cannot move money.
        </li>
        <li>
          <strong>Inbox data (optional)</strong> — if you connect Gmail or Outlook: the sender, subject, date and the short preview of emails that look like
          receipts, renewals, price changes or cancellation confirmations. We do not store full emails and never send email from your account.
        </li>
        <li>
          <strong>What we work out</strong> — the subscriptions we detect, our estimates of waste, and your choices (for example “I use this”).
        </li>
        <li>
          <strong>Cancellation requests</strong> — the letters you ask us to send, who they went to, and when you authorised them.
        </li>
        <li>
          <strong>Payment records</strong> — your plan and billing status from Stripe. Card details stay with Stripe.
        </li>
        <li>
          <strong>Technical data</strong> — error reports and cookieless usage statistics (pages viewed and which steps of the app were used), without cookies or
          tracking across other sites.
        </li>
      </ul>
    ),
  },
  {
    id: 'why',
    title: 'Why we use it, and our legal basis',
    body: (
      <ul>
        <li>
          <strong>To provide SubShield</strong> — finding recurring charges, showing estimates, sending alerts and cancellation requests you ask for. Legal
          basis: performing our contract with you.
        </li>
        <li>
          <strong>To take payment</strong> for Pro and keep financial records. Legal basis: contract, and legal obligation (tax and accounting records).
        </li>
        <li>
          <strong>To keep the service secure and working</strong> — error monitoring, abuse prevention and rate limits. Legal basis: our legitimate interest in
          running a safe, reliable service.
        </li>
        <li>
          <strong>To improve the product</strong> using aggregate, cookieless statistics. Legal basis: legitimate interests. You can object at any time.
        </li>
        <li>
          <strong>Product news</strong> — only if you opt in. Legal basis: consent, which you can withdraw with one click in any email.
        </li>
      </ul>
    ),
  },
  {
    id: 'never',
    title: 'What we never do',
    body: (
      <ul>
        <li>We never sell or rent your personal data, or share it for advertising.</li>
        <li>We never use your bank or inbox data to train AI models.</li>
        <li>We never contact a company on your behalf unless you have authorised that specific request.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <p>We use these providers to run SubShield. Each processes data only on our instructions, under a data processing agreement.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="type-label text-dim">
                <th className="py-2 pr-4 font-normal">Provider</th>
                <th className="py-2 pr-4 font-normal">What for</th>
                <th className="py-2 font-normal">Where</th>
              </tr>
            </thead>
            <tbody>
              {PROCESSORS.map(([name, purpose, where]) => (
                <tr key={name} className="border-t border-line align-top">
                  <td className="py-2 pr-4 font-medium">{name}</td>
                  <td className="py-2 pr-4">{purpose}</td>
                  <td className="py-2">{where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Plaid handles your bank connection under its own privacy policy:{' '}
          <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noreferrer noopener">
            Plaid End User Privacy Policy
          </a>
          .
        </p>
        <p>
          When you ask us to send a cancellation request, the company you are cancelling receives the letter, which includes your name and account email.
        </p>
        <p>We may disclose data if the law requires it, or to protect people from fraud or harm.</p>
      </>
    ),
  },
  {
    id: 'transfers',
    title: 'International transfers',
    body: (
      <p>
        Several providers above store data in the United States. When personal data leaves the UK we rely on the UK’s adequacy regulations (including the UK–US
        “data bridge” for certified companies) or on the UK International Data Transfer Agreement or Addendum to the EU Standard Contractual Clauses. You can ask
        us for details.
      </p>
    ),
  },
  {
    id: 'google',
    title: 'Google user data',
    body: (
      <p>
        If you connect Gmail, SubShield’s use and transfer of information received from Google APIs adheres to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer noopener">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. We use it only to detect subscriptions for you, and humans do not read it except with your permission, for
        security, or where the law requires.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <ul>
        <li>Bank and inbox data: while the connection is active. Disconnecting deletes the data imported from that connection.</li>
        <li>Everything else: until you delete your account, when it is erased from our systems.</li>
        <li>
          Exceptions: payment and invoice records, which we and Stripe keep for six years under tax law, and error reports, which our monitoring provider deletes
          automatically (typically within 90 days).
        </li>
      </ul>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>get a copy of your data (Plan &amp; alerts → Your data → Download my data);</li>
          <li>have it corrected, or deleted (Plan &amp; alerts → Your data → Delete my account);</li>
          <li>object to or restrict how we use it, and take it to another service;</li>
          <li>withdraw consent, such as for marketing or a mailbox connection, at any time.</li>
        </ul>
        <p>
          For anything else email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>; we reply within one month. You can also complain to the
          Information Commissioner’s Office at{' '}
          <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer noopener">
            ico.org.uk
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Bank and mailbox access tokens are encrypted (AES-256-GCM) before they are stored. Database access is limited so each account can only read its own rows,
        traffic is encrypted in transit, and access to production systems is restricted. If a breach puts your data at risk, we will tell you and the ICO as the
        law requires.
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and storage',
    body: (
      <p>
        We use only the cookies needed to keep you signed in and secure. Our usage statistics run without cookies or local storage. Your browser may store your
        “Motion” setting so the site remembers your choice.
      </p>
    ),
  },
  {
    id: 'age',
    title: 'Age',
    body: <p>SubShield is for people aged {MINIMUM_AGE} or over. We do not knowingly collect data from anyone younger.</p>,
  },
  {
    id: 'us',
    title: 'United States residents',
    body: (
      <p>
        We do not sell or “share” personal information for cross-context behavioural advertising, and we do not use sensitive information to infer
        characteristics about you. You can use the rights above wherever you live.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: <p>If we change this policy in a way that matters, we will email you before the change takes effect.</p>,
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          SubShield reads sensitive information — your bank transactions — so this page explains, in plain English, exactly what we collect, why, who else
          handles it and how to get it deleted.
        </p>
      }
      sections={sections}
    />
  )
}
