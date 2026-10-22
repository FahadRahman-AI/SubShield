import 'server-only'
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose'
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products, type RemovedTransaction, type Transaction } from 'plaid'
import { timingSafeEqual } from 'node:crypto'
import { sha256Hex } from '@/lib/crypto'
import { env, requireEnv } from '@/lib/env'

let client: PlaidApi | null = null

export function plaid(): PlaidApi {
  if (!client) {
    client = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[env.plaidEnv],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': requireEnv(env.plaidClientId, 'PLAID_CLIENT_ID'),
            'PLAID-SECRET': requireEnv(env.plaidSecret, 'PLAID_SECRET'),
          },
        },
      }),
    )
  }
  return client
}

export async function createLinkToken(userId: string): Promise<string> {
  const { data } = await plaid().linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'SubShield',
    products: [Products.Transactions],
    transactions: { days_requested: 730 },
    // US banks only. Open banking in the UK/EU is a regulated activity (account
    // information services); add GB/EU here only once that cover is in place.
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: `${env.appUrl}/api/plaid/webhook`,
  })
  return data.link_token
}

export async function exchangePublicToken(publicToken: string) {
  const { data } = await plaid().itemPublicTokenExchange({ public_token: publicToken })
  return { accessToken: data.access_token, itemId: data.item_id }
}

export async function removeItem(accessToken: string) {
  await plaid().itemRemove({ access_token: accessToken })
}

export interface SyncResult {
  added: Transaction[]
  modified: Transaction[]
  removed: RemovedTransaction[]
  cursor: string
  status: string
}

/**
 * Pages through /transactions/sync from a cursor. If Plaid reports the data
 * changed mid-pagination, restarts from the original cursor (per Plaid docs).
 */
export async function syncTransactions(accessToken: string, startCursor: string | null): Promise<SyncResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const result: SyncResult = { added: [], modified: [], removed: [], cursor: startCursor ?? '', status: 'UNKNOWN' }
    try {
      let hasMore = true
      while (hasMore) {
        const { data } = await plaid().transactionsSync({
          access_token: accessToken,
          cursor: result.cursor || undefined,
          count: 500,
          options: { include_personal_finance_category: true, days_requested: 730 },
        })
        result.added.push(...data.added)
        result.modified.push(...data.modified)
        result.removed.push(...data.removed)
        result.cursor = data.next_cursor
        result.status = data.transactions_update_status
        hasMore = data.has_more
      }
      return result
    } catch (err) {
      if (plaidErrorCode(err) !== 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') throw err
    }
  }
  throw new Error('Plaid sync kept changing during pagination')
}

export function plaidErrorCode(err: unknown): string | undefined {
  const data = (err as { response?: { data?: { error_code?: string } } })?.response?.data
  return data?.error_code
}

// ─── Webhook verification ────────────────────────────────────────────────────
// https://plaid.com/docs/api/webhooks/webhook-verification/

const keyCache = new Map<string, JWK>()

export async function verifyPlaidWebhook(rawBody: string, token: string | null): Promise<boolean> {
  if (!token) return false
  try {
    const header = decodeProtectedHeader(token)
    if (header.alg !== 'ES256' || !header.kid) return false
    let jwk = keyCache.get(header.kid)
    if (!jwk) {
      const { data } = await plaid().webhookVerificationKeyGet({ key_id: header.kid })
      jwk = data.key as unknown as JWK
      keyCache.set(header.kid, jwk)
    }
    const { payload } = await jwtVerify(token, await importJWK(jwk, 'ES256'), { maxTokenAge: '5 min' })
    const claimed = Buffer.from(String(payload.request_body_sha256 ?? ''), 'utf8')
    const actual = Buffer.from(sha256Hex(rawBody), 'utf8')
    return claimed.length === actual.length && timingSafeEqual(claimed, actual)
  } catch {
    return false
  }
}
