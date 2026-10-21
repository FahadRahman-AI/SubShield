import 'server-only'
import { env, requireEnv } from '@/lib/env'

// OAuth 2.0 authorization-code flow for mailbox access. Scopes are read-only.

export type MailProvider = 'google' | 'microsoft'

interface ProviderConfig {
  authorizeUrl: string
  tokenUrl: string
  scope: string
  clientId: () => string
  clientSecret: () => string
  extraParams: Record<string, string>
}

const PROVIDERS: Record<MailProvider, ProviderConfig> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email https://www.googleapis.com/auth/gmail.readonly',
    clientId: () => requireEnv(env.googleClientId, 'GOOGLE_CLIENT_ID'),
    clientSecret: () => requireEnv(env.googleClientSecret, 'GOOGLE_CLIENT_SECRET'),
    extraParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
  },
  microsoft: {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'openid email offline_access https://graph.microsoft.com/Mail.Read',
    clientId: () => requireEnv(env.microsoftClientId, 'MICROSOFT_CLIENT_ID'),
    clientSecret: () => requireEnv(env.microsoftClientSecret, 'MICROSOFT_CLIENT_SECRET'),
    extraParams: { prompt: 'select_account' },
  },
}

export function isMailProvider(p: string): p is MailProvider {
  return p === 'google' || p === 'microsoft'
}

export function redirectUri(provider: MailProvider) {
  return `${env.appUrl}/api/connect/${provider}/callback`
}

export function authorizeUrl(provider: MailProvider, state: string): string {
  const cfg = PROVIDERS[provider]
  const params = new URLSearchParams({
    client_id: cfg.clientId(),
    redirect_uri: redirectUri(provider),
    response_type: 'code',
    scope: cfg.scope,
    state,
    ...cfg.extraParams,
  })
  return `${cfg.authorizeUrl}?${params}`
}

export interface TokenSet {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
  email: string | null
}

async function tokenRequest(provider: MailProvider, body: Record<string, string>): Promise<TokenSet> {
  const cfg = PROVIDERS[provider]
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.clientId(), client_secret: cfg.clientSecret(), ...body }),
  })
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error?: string }
  if (!res.ok || !json.access_token) throw new Error(`OAuth token exchange failed: ${json.error ?? res.status}`)
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000),
    email: emailFromIdToken(json.id_token),
  }
}

export function exchangeCode(provider: MailProvider, code: string) {
  return tokenRequest(provider, { grant_type: 'authorization_code', code, redirect_uri: redirectUri(provider) })
}

export function refreshAccessToken(provider: MailProvider, refreshToken: string) {
  return tokenRequest(provider, { grant_type: 'refresh_token', refresh_token: refreshToken, scope: PROVIDERS[provider].scope })
}

// The id_token comes straight from the provider's token endpoint over TLS, so
// reading its payload without re-verifying the signature is acceptable here.
function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')) as { email?: string; preferred_username?: string }
    return payload.email ?? payload.preferred_username ?? null
  } catch {
    return null
  }
}
