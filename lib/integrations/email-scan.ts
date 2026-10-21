import { MERCHANTS } from '@/lib/catalog/merchants'
import { normalizeDescriptor } from '@/lib/detection/normalize'
import type { EmailSignalKind } from '@/lib/detection/types'
import type { MailProvider } from './email-oauth'

// Inbox scanning: metadata + snippet only. Messages are classified into
// receipts, renewal notices, price changes, trial-ending notices and
// cancellation confirmations, then attributed to a known merchant.

export interface RawMessage {
  id: string
  from: string
  subject: string
  snippet: string
  date: string // YYYY-MM-DD
}

export interface ParsedSignal {
  externalId: string
  kind: EmailSignalKind
  merchantKey: string
  sender: string
  subject: string
  amount: number | null
  currency: string | null
  date: string
}

const KIND_PATTERNS: [EmailSignalKind, RegExp][] = [
  ['cancellation', /\b(cancel(l)?ed|cancellation (is )?(confirmed|complete)|membership (has )?ended|sorry to see you go|subscription (has been )?cancel)/i],
  ['price_change', /\b(price (change|increase|update)|new (price|pricing)|rate (change|increase)|changes to your (plan|subscription) price)/i],
  ['trial_ending', /\b(trial (ends|ending|is ending|expires|will end)|free trial)/i],
  ['renewal_notice', /\b(renew(s|al|ing)?|upcoming (payment|charge)|will be charged|auto-?renew)/i],
  ['receipt', /\b(receipt|invoice|payment (received|confirmation|successful)|your (bill|order)|thanks for your payment|billing statement)/i],
]

const AMOUNT = /(?:US)?\s?([$£€])\s?(\d{1,4}(?:[.,]\d{3})*[.,]\d{2})/

function registrable(domain: string): string {
  return domain.toLowerCase().split('.').slice(-2).join('.')
}

export const GMAIL_QUERY =
  'newer_than:400d -category:social (subject:(receipt OR invoice OR subscription OR renewal OR renew OR "price" OR cancelled OR canceled OR cancellation OR trial OR membership OR "payment confirmation"))'

export function parseMessage(msg: RawMessage): ParsedSignal | null {
  const text = `${msg.subject} ${msg.snippet}`
  const kind = KIND_PATTERNS.find(([, re]) => re.test(text))?.[0]
  if (!kind) return null

  // Attribute by sender first (a bank statement that mentions "Netflix" must
  // not count as a Netflix receipt); use the content only to pick between
  // products that share a sender domain (apple.com, google.com…).
  const senderDomain = registrable(msg.from.match(/@([\w.-]+)/)?.[1] ?? '')
  const senderName = normalizeDescriptor(msg.from.replace(/<.*?>/g, ' '))
  const candidates = MERCHANTS.filter(
    (m) => (senderDomain && registrable(m.domain) === senderDomain) || m.aliases.some((re) => re.test(senderName)),
  )
  if (!candidates.length) return null
  const content = normalizeDescriptor(text)
  const merchant = candidates.length === 1 ? candidates[0] : (candidates.find((m) => m.aliases.some((re) => re.test(content))) ?? candidates[0])

  const amountMatch = text.match(AMOUNT)
  const amount = amountMatch ? Number(amountMatch[2].replace(/,(?=\d{3})/g, '').replace(',', '.')) : null
  const currency = amountMatch ? ({ $: 'USD', '£': 'GBP', '€': 'EUR' } as const)[amountMatch[1] as '$' | '£' | '€'] : null

  return {
    externalId: msg.id,
    kind,
    merchantKey: merchant.key,
    sender: msg.from,
    subject: msg.subject.slice(0, 300),
    amount: amount && amount > 0 && amount < 10_000 ? amount : null,
    currency,
    date: msg.date,
  }
}

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Mail API ${res.status}: ${await res.text().catch(() => '')}`)
  return (await res.json()) as T
}

async function fetchGmail(accessToken: string, limit: number): Promise<RawMessage[]> {
  const ids: string[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({ q: GMAIL_QUERY, maxResults: '100', ...(pageToken ? { pageToken } : {}) })
    const page = await getJson<{ messages?: { id: string }[]; nextPageToken?: string }>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      accessToken,
    )
    ids.push(...(page.messages ?? []).map((m) => m.id))
    pageToken = page.nextPageToken
  } while (pageToken && ids.length < limit)

  const out: RawMessage[] = []
  for (let i = 0; i < Math.min(ids.length, limit); i += 20) {
    const batch = await Promise.all(
      ids.slice(i, i + 20).map((id) =>
        getJson<{ id: string; snippet: string; internalDate: string; payload: { headers: { name: string; value: string }[] } }>(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          accessToken,
        ),
      ),
    )
    for (const m of batch) {
      const header = (n: string) => m.payload.headers.find((h) => h.name.toLowerCase() === n)?.value ?? ''
      out.push({ id: m.id, from: header('from'), subject: header('subject'), snippet: m.snippet ?? '', date: new Date(Number(m.internalDate)).toISOString().slice(0, 10) })
    }
  }
  return out
}

async function fetchOutlook(accessToken: string, limit: number): Promise<RawMessage[]> {
  const out: RawMessage[] = []
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString()
  let url: string | undefined =
    `https://graph.microsoft.com/v1.0/me/messages?$select=id,subject,from,bodyPreview,receivedDateTime&$top=50` +
    `&$filter=receivedDateTime ge ${since}&$orderby=receivedDateTime desc`
  while (url && out.length < limit) {
    const page: { value: { id: string; subject: string; bodyPreview: string; receivedDateTime: string; from?: { emailAddress?: { name?: string; address?: string } } }[]; '@odata.nextLink'?: string } =
      await getJson(url, accessToken)
    for (const m of page.value) {
      out.push({
        id: m.id,
        from: `${m.from?.emailAddress?.name ?? ''} <${m.from?.emailAddress?.address ?? ''}>`,
        subject: m.subject ?? '',
        snippet: m.bodyPreview ?? '',
        date: m.receivedDateTime.slice(0, 10),
      })
    }
    url = page['@odata.nextLink']
  }
  return out
}

export async function scanMailbox(provider: MailProvider, accessToken: string, limit = 400): Promise<ParsedSignal[]> {
  const messages = provider === 'google' ? await fetchGmail(accessToken, limit) : await fetchOutlook(accessToken, limit)
  return messages.map(parseMessage).filter((s): s is ParsedSignal => s !== null)
}
