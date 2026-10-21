import { after, NextResponse, type NextRequest } from 'next/server'
import { getViewer } from '@/lib/auth'
import { encryptToken, verifyState } from '@/lib/crypto'
import { exchangeCode, isMailProvider } from '@/lib/integrations/email-oauth'
import { createAdminClient } from '@/lib/supabase/server'
import { syncUser } from '@/lib/sync/sync-user'

export async function GET(request: NextRequest, ctx: RouteContext<'/api/connect/[provider]/callback'>) {
  const { provider } = await ctx.params
  const back = new URL('/dashboard/connections', request.nextUrl.origin)
  const fail = (reason: string) => {
    back.searchParams.set('error', reason)
    const res = NextResponse.redirect(back)
    res.cookies.delete({ name: 'ss_oauth_nonce', path: '/api/connect' })
    return res
  }

  if (!isMailProvider(provider)) return fail('unknown-provider')
  const code = request.nextUrl.searchParams.get('code')
  const state = verifyState<{ uid: string; nonce: string; provider: string }>(request.nextUrl.searchParams.get('state') ?? '')
  const nonce = request.cookies.get('ss_oauth_nonce')?.value
  const viewer = await getViewer()
  if (!code || !state || !viewer || state.uid !== viewer.id || state.provider !== provider || !nonce || state.nonce !== nonce) {
    return fail('oauth-state')
  }

  try {
    const tokens = await exchangeCode(provider, code)
    const admin = createAdminClient()
    const { data: conn, error } = await admin
      .from('app_connections')
      .insert({
        user_id: viewer.id,
        provider,
        access_token: encryptToken(tokens.accessToken),
        refresh_token: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        token_expires_at: tokens.expiresAt.toISOString(),
        account_email: tokens.email,
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw error
    after(() => syncUser(viewer.id, { connectionId: conn.id }).then(() => undefined).catch((err) => console.error('[oauth] first scan', err)))
  } catch (err) {
    console.error('[oauth] callback', err)
    return fail('oauth-exchange')
  }

  back.searchParams.set('connected', provider)
  const res = NextResponse.redirect(back)
  res.cookies.delete({ name: 'ss_oauth_nonce', path: '/api/connect' })
  return res
}
